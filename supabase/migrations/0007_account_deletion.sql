-- ====================================================================
-- FynPad — Part 11: Account Deletion
-- ====================================================================
--
-- delete_user_account():
--   Çağıran auth kullanıcının auth.users kaydını siler. Tüm referans veri
--   (profiles, categories, transactions, recurring_rules, category_budgets)
--   FK'lar `on delete cascade` olduğu için otomatik temizlenir. Geri alınamaz.
--
--   Apple App Store 5.1.1(v) + Google Play account-deletion + GDPR 17 / KVKK 7
--   gereği yayın için zorunlu.
--
-- Security: SECURITY DEFINER + search_path kilitli (privilege escalation önler).

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  -- auth.users'tan sil → tüm FK'lar ON DELETE CASCADE ile temizlenir
  -- (profiles, categories, transactions, recurring_rules, category_budgets
  --  hepsi user_id/id üzerinden auth.users'a CASCADE referans veriyor)
  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_user_account() to authenticated;
revoke execute on function public.delete_user_account() from public, anon;
