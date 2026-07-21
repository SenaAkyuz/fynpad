-- 0015 — Recurring: koşullu ilk işlem + garantili catch-up.
--
-- Sorun: 0013'teki create_recurring_rule_with_initial_transaction, initial transaction'ı
-- KOŞULSUZ olarak p_initial_transaction_date'e yazıyordu. İstemci bu alana her zaman "bugün"ü
-- gönderdiği için, GEÇMİŞ tarihli başlangıçta (ör. 6 Mayıs) kuralın occurrence'ı olmayan
-- yanlış bir "bugün" işlemi oluşuyordu. Geçmiş occurrence'lar (6 May/Haz/Tem) ise yalnızca
-- catch-up'a bağlıydı.
--
-- Bu migration:
--   1. p_initial_transaction_date NULL ise initial transaction'ı ATLAR (geçmiş/gelecek
--      başlangıçta bugüne kayıt yazılmaz; occurrence'lar yalnızca catch-up'tan gelir).
--   2. process_recurring_rules çağrısını KORUR — kural oluşturulur oluşturulmaz geçmiş
--      occurrence'lar (start_date'ten bugüne) üretilir. Bu fonksiyon yeniden tanımlandığı
--      için çağrının varlığı da garanti altına alınır.
--
-- Idempotency ve güvenlik değişmedi: (user_id, client_request_id) unique index çift kaydı,
-- (recurring_rule_id, date) unique index + ON CONFLICT DO NOTHING occurrence duplicate'ini,
-- auth.uid() + kategori sahiplik kontrolü yetkisiz yazımı engeller.
-- İmza 0013 ile AYNI (13 parametre) — grant'lar değişmez.

create or replace function public.create_recurring_rule_with_initial_transaction(
  p_client_request_id uuid,
  p_category_id uuid,
  p_amount numeric,
  p_currency text,
  p_kind text,
  p_note text,
  p_frequency text,
  p_day_of_week int,
  p_day_of_month int,
  p_month_of_year int,
  p_start_date date,
  p_end_date date,
  p_initial_transaction_date date
) returns public.recurring_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_rule public.recurring_rules%rowtype;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_client_request_id is null then
    raise exception 'client_request_id is required';
  end if;
  if not exists (
    select 1 from public.categories
    where id = p_category_id and user_id = current_user_id
  ) then
    raise exception 'Category is not available to current user';
  end if;

  insert into public.recurring_rules (
    user_id, category_id, amount, currency, kind, note,
    frequency, day_of_week, day_of_month, month_of_year,
    start_date, end_date, client_request_id
  ) values (
    current_user_id, p_category_id, p_amount, p_currency, p_kind, p_note,
    p_frequency, p_day_of_week, p_day_of_month, p_month_of_year,
    p_start_date, p_end_date, p_client_request_id
  )
  on conflict (user_id, client_request_id) where client_request_id is not null
  do nothing
  returning * into created_rule;

  -- Çift dokunma / ağ retry: aynı client_request_id ile kural zaten oluşmuş → onu getir.
  if created_rule.id is null then
    select * into created_rule
    from public.recurring_rules
    where user_id = current_user_id
      and client_request_id = p_client_request_id;
  end if;

  -- İlk işlem YALNIZCA tarih verildiyse (başlangıç bugünse "bugün ödedim" kaydı).
  -- NULL ise atlanır: geçmiş/gelecek başlangıçta bugüne yanlış kayıt yazılmaz.
  if p_initial_transaction_date is not null then
    insert into public.transactions (
      user_id, category_id, amount, currency, kind, date, note, recurring_rule_id
    ) values (
      current_user_id, created_rule.category_id, created_rule.amount, created_rule.currency,
      created_rule.kind, p_initial_transaction_date, created_rule.note, created_rule.id
    )
    on conflict (recurring_rule_id, date) where recurring_rule_id is not null
    do nothing;
  end if;

  -- Geçmiş occurrence'ları (start_date'ten bugüne) üret. last_generated_date NULL olduğu
  -- için catch-up start_date'ten başlar; (recurring_rule_id, date) unique index yukarıdaki
  -- initial ile çakışan tarihte duplicate üretmez.
  perform public.process_recurring_rules(current_user_id, current_date);
  return created_rule;
end;
$$;

revoke all on function public.create_recurring_rule_with_initial_transaction(
  uuid, uuid, numeric, text, text, text, text, int, int, int, date, date, date
) from public, anon;
grant execute on function public.create_recurring_rule_with_initial_transaction(
  uuid, uuid, numeric, text, text, text, text, int, int, int, date, date, date
) to authenticated;
