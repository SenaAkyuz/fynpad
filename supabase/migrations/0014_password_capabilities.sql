create table if not exists public.user_auth_capabilities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  has_password boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_auth_capabilities enable row level security;
drop policy if exists "Users view own auth capabilities" on public.user_auth_capabilities;
create policy "Users view own auth capabilities"
  on public.user_auth_capabilities for select using (auth.uid() = user_id);

insert into public.user_auth_capabilities(user_id, has_password)
select u.id,
  coalesce(u.raw_app_meta_data->'providers' ? 'email', false)
    or coalesce(u.raw_app_meta_data->>'provider' = 'email', false)
from auth.users u
on conflict (user_id) do update
set has_password = public.user_auth_capabilities.has_password or excluded.has_password,
    updated_at = now();

create or replace function public.handle_new_user_auth_capabilities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_auth_capabilities(user_id, has_password)
  values (new.id,
    coalesce(new.raw_app_meta_data->'providers' ? 'email', false)
      or coalesce(new.raw_app_meta_data->>'provider' = 'email', false))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_capabilities_created on auth.users;
create trigger on_auth_user_capabilities_created after insert on auth.users
  for each row execute procedure public.handle_new_user_auth_capabilities();

create or replace function public.get_my_password_status()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select has_password from public.user_auth_capabilities
    where user_id = auth.uid()), false);
$$;

create or replace function public.mark_my_password_created()
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  insert into public.user_auth_capabilities(user_id, has_password, updated_at)
  values (current_user_id, true, now())
  on conflict (user_id) do update set has_password = true, updated_at = now();
end;
$$;

revoke all on function public.get_my_password_status() from public, anon;
grant execute on function public.get_my_password_status() to authenticated;
revoke all on function public.mark_my_password_created() from public, anon;
grant execute on function public.mark_my_password_created() to authenticated;
