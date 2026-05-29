-- ====================================================================
-- FynPad — Goals enhancement: Monthly Savings Target
-- Profile'a opsiyonel aylık birikim hedefi + para birimi ekler.
-- ====================================================================

alter table public.profiles
  add column if not exists monthly_savings_target numeric(15,2)
    check (monthly_savings_target is null or monthly_savings_target > 0),
  add column if not exists monthly_savings_target_currency text
    check (monthly_savings_target_currency is null
           or monthly_savings_target_currency in ('TRY','USD','EUR'));
