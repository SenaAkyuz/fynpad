-- Atomik recurring rule + ilk transaction oluşturma.
-- client_request_id ağ retry/çift dokunmada ikinci rule oluşmasını engeller.

alter table public.recurring_rules
  add column if not exists client_request_id uuid;

create unique index if not exists recurring_rules_user_request_unique
  on public.recurring_rules(user_id, client_request_id)
  where client_request_id is not null;

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

  if created_rule.id is null then
    select * into created_rule
    from public.recurring_rules
    where user_id = current_user_id
      and client_request_id = p_client_request_id;
  end if;

  insert into public.transactions (
    user_id, category_id, amount, currency, kind, date, note, recurring_rule_id
  ) values (
    current_user_id, created_rule.category_id, created_rule.amount, created_rule.currency,
    created_rule.kind, p_initial_transaction_date, created_rule.note, created_rule.id
  )
  on conflict (recurring_rule_id, date) where recurring_rule_id is not null
  do nothing;

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
