-- ====================================================================
-- FynPad — Part 2: Auth schema
-- profiles table + RLS + auto-create trigger
-- ====================================================================

-- profiles table extends auth.users with app-specific fields
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  default_currency text not null default 'TRY' check (default_currency in ('TRY','USD','EUR')),
  locale text not null default 'tr' check (locale in ('tr','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable RLS
alter table public.profiles enable row level security;

-- policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- auto-create profile on signup
-- locale and default_currency come from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, locale, default_currency)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'locale', 'tr'),
    coalesce(new.raw_user_meta_data->>'default_currency', 'TRY')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
