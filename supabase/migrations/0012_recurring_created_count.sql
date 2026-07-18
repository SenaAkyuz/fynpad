-- ====================================================================
-- FynPad — 0012: recurring created_count doğruluğu
-- ====================================================================
--
-- Bu migration YIKICI DEĞİLDİR: yalnızca fonksiyon gövdesini yeniden tanımlar.
-- Hiçbir tablo/veri değiştirilmez, silinmez.
--
-- Sorun (0004'ten devreden): insert şu sırayla çalışıyordu
--   1. exists() kontrolü
--   2. INSERT ... ON CONFLICT DO NOTHING
--   3. KOŞULSUZ created_count := created_count + 1
--
-- Eşzamanlı iki çağrıda ikisi de exists() kontrolünü "yok" görüp geçebiliyor;
-- ikinci INSERT unique index nedeniyle satır EKLEMİYOR ama sayaç yine artıyordu.
-- Sonuç: RPC gerçekte üretilmeyen işlemleri üretilmiş gibi raporluyordu. İstemci
-- bu sayıya bakıp (created > 0) gereksiz cache invalidation tetikliyordu.
--
-- Düzeltme: sayaç yalnızca INSERT gerçekten satır eklediyse artar.
-- Doğruluğun garantisi artık unique index + ROW_COUNT; exists() kontrolü yalnızca
-- gereksiz insert denemesini azaltan bir OPTİMİZASYON olarak kalır.
--
-- 0011'deki güvenlik sınırları (search_path = '', tarih sıkıştırma, catch-up
-- penceresi) AYNEN KORUNUR — bkz. 0011_harden_rpc_permissions.sql.

create or replace function public.process_recurring_rules(
  p_user_id uuid,
  p_target_date date default current_date
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recurring_rules%rowtype;
  cur_date date;
  upto date;
  created_count int := 0;
  already_exists boolean;
  inserted_rows int;
  max_catchup_days constant int := 400;
  earliest_allowed date;
begin
  -- 0011: geleceğe işlem üretme.
  p_target_date := least(coalesce(p_target_date, current_date), current_date);
  earliest_allowed := p_target_date - max_catchup_days;

  for r in
    select * from public.recurring_rules
    where user_id = p_user_id
      and active = true
      and start_date <= p_target_date
      and (end_date is null or end_date >= start_date)
  loop
    cur_date := greatest(
      r.start_date,
      coalesce(r.last_generated_date + interval '1 day', r.start_date)::date
    );
    -- 0011: catch-up penceresi.
    cur_date := greatest(cur_date, earliest_allowed);
    upto := least(p_target_date, coalesce(r.end_date, p_target_date));

    while cur_date <= upto loop
      if public.recurring_rule_fires_on(r, cur_date) then
        select exists(
          select 1 from public.transactions
          where recurring_rule_id = r.id and date = cur_date
        ) into already_exists;

        if not already_exists then
          insert into public.transactions (
            user_id, category_id, amount, currency, kind, date, note, recurring_rule_id
          ) values (
            r.user_id, r.category_id, r.amount, r.currency, r.kind, cur_date, r.note, r.id
          )
          on conflict (recurring_rule_id, date) where recurring_rule_id is not null
          do nothing;

          -- DÜZELTME: yarışta conflict olduysa ROW_COUNT = 0 → sayaç artmaz.
          get diagnostics inserted_rows = row_count;
          created_count := created_count + inserted_rows;
        end if;
      end if;

      cur_date := cur_date + interval '1 day';
    end loop;

    if upto >= r.start_date then
      update public.recurring_rules
      set last_generated_date = greatest(coalesce(last_generated_date, upto), upto)
      where id = r.id;
    end if;
  end loop;

  return created_count;
end;
$$;

-- 0011'deki yetki düzeni korunur (create or replace yetkileri sıfırlamaz, yine de
-- idempotent olarak yeniden uygulanır).
revoke all on function public.process_recurring_rules(uuid, date) from public, anon, authenticated;

-- ====================================================================
-- DOĞRULAMA (elle)
-- ====================================================================
--
-- Aynı kural için RPC'yi iki kez arka arkaya çağır:
--   select public.process_my_recurring_rules(current_date);  -- ilk çağrı: N (>0 olabilir)
--   select public.process_my_recurring_rules(current_date);  -- ikinci çağrı: 0 OLMALI
--
-- Önceki davranışta ikinci çağrı da 0'dan büyük dönebiliyordu.
--
-- ====================================================================
-- GERİ ALMA
-- ====================================================================
--   0011_harden_rpc_permissions.sql dosyasındaki process_recurring_rules
--   tanımını yeniden çalıştırın.
