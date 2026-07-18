-- ====================================================================
-- FynPad — 0011: RPC yetkilendirme sertleştirmesi + kategori sahiplik bütünlüğü
-- ====================================================================
--
-- Bu migration YIKICI DEĞİLDİR: hiçbir kullanıcı verisini UPDATE/DELETE etmez.
-- Yalnızca yetki (GRANT/REVOKE), fonksiyon gövdesi ve kısıt (constraint) ekler.
--
-- Sorun: SECURITY DEFINER fonksiyonların execute yetkisi açıkça kısıtlanmamıştı.
-- PostgreSQL'de fonksiyonlar varsayılan olarak PUBLIC execute alır ve Supabase
-- bunları PostgREST RPC yüzeyinden erişilebilir kılar. Bu da bir istemcinin
-- başka kullanıcının UUID'siyle işlem üretmesine, ileri tarih vererek kaynak
-- tüketmesine veya cron fonksiyonunu tetiklemesine imkân veriyordu.

-- ──────────────────────────────────────────────
-- 1) İç/admin fonksiyonları istemci rollerine KAPAT
-- ──────────────────────────────────────────────
--
-- Bu üçü yalnızca DB içinden (başka fonksiyon veya cron context'i) çağrılır.
-- process_my_recurring_rules SECURITY DEFINER olduğu için, altındaki
-- process_recurring_rules'a execute yetkisi olmadan da onu çağırabilir.

revoke all on function public.process_recurring_rules(uuid, date) from public, anon, authenticated;
revoke all on function public.process_recurring_rules_all_users() from public, anon, authenticated;
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;

-- ──────────────────────────────────────────────
-- 2) process_recurring_rules — search_path sertleştirme + tarih sınırı
-- ──────────────────────────────────────────────
--
-- Değişiklikler (imza AYNI, mevcut çağrılar bozulmaz):
--   a) set search_path = '' → object-shadowing riski kapanır; tüm nesneler şema adıyla.
--   b) p_target_date current_date ile sınırlanır → geleceğe işlem üretilemez.
--   c) Catch-up penceresi MAX_CATCHUP_DAYS ile sınırlanır → sınırsız günlük loop yok.
--
-- NOT: created_count doğruluğu (eşzamanlı insert'te şişme) bu migration'ın KAPSAMINDA
-- DEĞİL; 05 belgesinde ayrı migration ile ele alınacak. Buradaki gövde 0004'teki
-- ON CONFLICT DO NOTHING davranışını aynen korur.

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
  -- Geçmiş catch-up üst sınırı. Yıllık kuralları da kapsaması için 1 yıldan biraz uzun.
  -- Uygulama her açılışta catch-up yaptığından normal kullanımda bu sınıra hiç yaklaşılmaz;
  -- amaç uzun süre açılmamış hesapta tek çağrıda binlerce satır üretilmesini engellemek.
  max_catchup_days constant int := 400;
  earliest_allowed date;
begin
  -- Geleceğe işlem üretme: hedef tarihi bugüne sıkıştır.
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
    -- Catch-up penceresi: çok eski başlangıçlarda yalnızca son max_catchup_days işlenir.
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

-- ──────────────────────────────────────────────
-- 3) process_my_recurring_rules — istemcinin çağırabildiği TEK recurring fonksiyonu
-- ──────────────────────────────────────────────
--
-- Kullanıcı ID'sini DIŞARIDAN ALMAZ; her zaman auth.uid(). Tarih burada da
-- sınırlanır (savunma katmanı — alttaki fonksiyon zaten sıkıştırıyor).

create or replace function public.process_my_recurring_rules(
  p_target_date date default current_date
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  return public.process_recurring_rules(
    current_user_id,
    least(coalesce(p_target_date, current_date), current_date)
  );
end;
$$;

revoke all on function public.process_my_recurring_rules(date) from public, anon;
grant execute on function public.process_my_recurring_rules(date) to authenticated;

-- ──────────────────────────────────────────────
-- 4) delete_user_account — 0007'deki düzeni yeniden doğrula (idempotent)
-- ──────────────────────────────────────────────

revoke all on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;

-- ──────────────────────────────────────────────
-- 5) Kategori sahiplik bütünlüğü — cross-user category_id engeli
-- ──────────────────────────────────────────────
--
-- RLS yalnızca satırın user_id'sini kontrol ediyordu; bir kullanıcı BAŞKASININ
-- category_id'siyle kendi adına transaction/kural/bütçe oluşturabilirdi.
-- Composite FK ile bu DB seviyesinde imkânsız hale gelir.
--
-- ÖNEMLİ: Kısıtlar NOT VALID olarak eklenir.
--   • NOT VALID = mevcut satırlar TARANMAZ (migration hiçbir veriyi reddetmez/silmez),
--     fakat YENİ insert/update'ler kısıta UYAR. İhtiyacımız olan koruma budur.
--   • Mevcut veride ihlal olup olmadığını görmek ve kısıtı tam doğrulamak için
--     bu dosyanın sonundaki "doğrulama" bloğuna bakın.

-- FK hedefi için gerekli: categories(id, user_id) unique.
-- id zaten PK olduğundan bu kısıt hiçbir mevcut satırı reddetmez.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_id_user_id_key'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_id_user_id_key unique (id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_category_owner_fk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_category_owner_fk
      foreign key (category_id, user_id)
      references public.categories (id, user_id)
      on delete restrict
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recurring_rules_category_owner_fk'
      and conrelid = 'public.recurring_rules'::regclass
  ) then
    alter table public.recurring_rules
      add constraint recurring_rules_category_owner_fk
      foreign key (category_id, user_id)
      references public.categories (id, user_id)
      on delete restrict
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'category_budgets_category_owner_fk'
      and conrelid = 'public.category_budgets'::regclass
  ) then
    alter table public.category_budgets
      add constraint category_budgets_category_owner_fk
      foreign key (category_id, user_id)
      references public.categories (id, user_id)
      on delete cascade
      not valid;
  end if;
end $$;

-- ====================================================================
-- DOĞRULAMA (migration'ın parçası değil — SQL Editor'da elle çalıştırın)
-- ====================================================================
--
-- A) Yetkiler beklendiği gibi mi?
--
--   select
--     p.proname,
--     has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_can_execute,
--     has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in (
--       'process_recurring_rules',
--       'process_my_recurring_rules',
--       'process_recurring_rules_all_users',
--       'seed_default_categories',
--       'delete_user_account'
--     );
--
--   Beklenen: process_my_recurring_rules → anon false / authenticated true
--             delete_user_account        → anon false / authenticated true
--             diğer üçü                  → anon false / authenticated false
--
-- B) Mevcut veride cross-user kategori ihlali var mı? (salt okunur)
--
--   select 'transactions' as tbl, count(*) from public.transactions t
--     join public.categories c on c.id = t.category_id where c.user_id <> t.user_id
--   union all
--   select 'recurring_rules', count(*) from public.recurring_rules r
--     join public.categories c on c.id = r.category_id where c.user_id <> r.user_id
--   union all
--   select 'category_budgets', count(*) from public.category_budgets b
--     join public.categories c on c.id = b.category_id where c.user_id <> b.user_id;
--
-- C) (B) hepsinde 0 dönüyorsa kısıtları tam doğrula. 0 DEĞİLSE önce veriyi
--    incele — bu komutlar veri SİLMEZ, yalnızca ihlal varsa hata verir:
--
--   alter table public.transactions     validate constraint transactions_category_owner_fk;
--   alter table public.recurring_rules  validate constraint recurring_rules_category_owner_fk;
--   alter table public.category_budgets validate constraint category_budgets_category_owner_fk;
--
-- ====================================================================
-- GERİ ALMA (rollback)
-- ====================================================================
--
--   alter table public.transactions     drop constraint if exists transactions_category_owner_fk;
--   alter table public.recurring_rules  drop constraint if exists recurring_rules_category_owner_fk;
--   alter table public.category_budgets drop constraint if exists category_budgets_category_owner_fk;
--   alter table public.categories       drop constraint if exists categories_id_user_id_key;
--   grant execute on function public.process_recurring_rules(uuid, date) to authenticated;
--   grant execute on function public.process_recurring_rules_all_users() to authenticated;
--   grant execute on function public.seed_default_categories(uuid) to authenticated;
--   -- fonksiyon gövdeleri için 0003 ve 0004 migration'larını yeniden çalıştırın.
