-- ====================================================================
-- FynPad — Part 6 Fix: tekrarlayan işlemde çift transaction'ı engelle
-- ====================================================================
--
-- Bug: bir recurring rule oluşturulunca DB'de 2 transaction çıkıyordu.
-- Kök neden: process_recurring_rules'ın check-then-insert'i (TOCTOU) atomik değildi;
-- create-RPC ile foreground tetiği eşzamanlı çalışınca ikisi de "yok" görüp insert ediyordu.
-- Fix: (1) mevcut duplicate'leri temizle, (2) partial unique index, (3) insert'i ON CONFLICT
-- DO NOTHING ile yarış-güvenli yap (idempotency check korunur).

-- ──────────────────────────────────────────────
-- 1) Mevcut duplicate'leri temizle (unique index ÖNCESİ — yoksa index kurulamaz).
--    Her (recurring_rule_id, date) grubunda en eski kayıt (created_at, sonra id) kalır.
-- ──────────────────────────────────────────────

delete from public.transactions t1
using public.transactions t2
where t1.recurring_rule_id is not null
  and t1.recurring_rule_id = t2.recurring_rule_id
  and t1.date = t2.date
  and (t1.created_at > t2.created_at
       or (t1.created_at = t2.created_at and t1.id > t2.id));

-- ──────────────────────────────────────────────
-- 2) Partial unique index: aynı (recurring_rule_id, date) için tek satır.
--    recurring_rule_id NULL ise (manuel/silinmiş kuraldan kalan) constraint uygulanmaz.
-- ──────────────────────────────────────────────

create unique index if not exists transactions_recurring_unique_per_date
  on public.transactions(recurring_rule_id, date)
  where recurring_rule_id is not null;

-- ──────────────────────────────────────────────
-- 3) process_recurring_rules: insert'i ON CONFLICT DO NOTHING ile yarış-güvenli yap.
--    İmza değişmedi; yalnızca insert satırı güncellendi. already_exists check'i korunur
--    (gereksiz insert denemesini ve created_count şişmesini azaltır); on conflict ise
--    eşzamanlı çağrılarda 2. satırın oluşmasını YAPISAL olarak engeller ve unique
--    violation fırlatmadığı için awaited create akışını bozmaz.
-- ──────────────────────────────────────────────

create or replace function public.process_recurring_rules(
  p_user_id uuid,
  p_target_date date default current_date
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.recurring_rules%rowtype;
  cur_date date;
  upto date;
  created_count int := 0;
  already_exists boolean;
begin
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
          created_count := created_count + 1;
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
