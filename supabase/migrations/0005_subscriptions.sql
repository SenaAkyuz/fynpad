-- ====================================================================
-- FynPad — Part 7: Subscription metadata on recurring_rules
-- ====================================================================
--
-- Abonelik = recurring_rules'un metadata'lı bir alt türü (brief 4.4).
-- is_subscription=true olan kurallar Subscription Manager'da yönetilir.

alter table public.recurring_rules
  add column if not exists is_subscription boolean not null default false,
  add column if not exists service_name text,
  add column if not exists plan_name text,
  add column if not exists icon_key text;

-- Constraint: subscription ise servis adı dolu + gider + monthly/yearly olmalı.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_required_fields'
  ) then
    alter table public.recurring_rules
      add constraint subscription_required_fields check (
        not is_subscription or (
          service_name is not null
          and kind = 'expense'
          and frequency in ('monthly','yearly')
        )
      );
  end if;
end $$;

create index if not exists recurring_rules_subscription_idx
  on public.recurring_rules(user_id, is_subscription)
  where is_subscription = true;
