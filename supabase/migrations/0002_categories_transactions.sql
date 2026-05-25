-- ====================================================================
-- FynPad — Part 5: Categories + Transactions
-- ====================================================================

-- ──────────────────────────────────────────────
-- CATEGORIES
-- ──────────────────────────────────────────────

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  kind text not null check (kind in ('income','expense')),
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_kind_idx on public.categories(kind);

alter table public.categories enable row level security;

drop policy if exists "Users view own categories" on public.categories;
create policy "Users view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own categories" on public.categories;
create policy "Users insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own categories" on public.categories;
create policy "Users update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own non-default categories" on public.categories;
create policy "Users delete own non-default categories"
  on public.categories for delete
  using (auth.uid() = user_id and is_default = false);

drop trigger if exists on_category_updated on public.categories;
create trigger on_category_updated
  before update on public.categories
  for each row execute procedure public.handle_updated_at();

-- ──────────────────────────────────────────────
-- TRANSACTIONS
-- ──────────────────────────────────────────────

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid not null references public.categories on delete restrict,
  amount numeric(15,2) not null check (amount > 0),
  currency text not null check (currency in ('TRY','USD','EUR')),
  kind text not null check (kind in ('income','expense')),
  date date not null default current_date,
  note text,
  recurring_rule_id uuid,        -- Part 6'da FK eklenecek
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_id_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_kind_idx on public.transactions(kind);

alter table public.transactions enable row level security;

drop policy if exists "Users view own transactions" on public.transactions;
create policy "Users view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own transactions" on public.transactions;
create policy "Users insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own transactions" on public.transactions;
create policy "Users update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own transactions" on public.transactions;
create policy "Users delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

drop trigger if exists on_transaction_updated on public.transactions;
create trigger on_transaction_updated
  before update on public.transactions
  for each row execute procedure public.handle_updated_at();

-- ──────────────────────────────────────────────
-- DEFAULT CATEGORIES — auto-seed on signup
-- ──────────────────────────────────────────────

create or replace function public.seed_default_categories(p_user_id uuid)
returns void
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, icon, color, kind, is_default, sort_order) values
    (p_user_id, 'dashboard.categories.salary',        'briefcase',       '#006c49', 'income',  true, 1),
    (p_user_id, 'dashboard.categories.freelance',     'edit-3',          '#0d8569', 'income',  true, 2),
    (p_user_id, 'dashboard.categories.groceries',     'shopping-bag',    '#b90538', 'expense', true, 1),
    (p_user_id, 'dashboard.categories.rent',          'home',            '#7c2d12', 'expense', true, 2),
    (p_user_id, 'dashboard.categories.transport',     'navigation',      '#1d4ed8', 'expense', true, 3),
    (p_user_id, 'dashboard.categories.food',          'coffee',          '#dc2626', 'expense', true, 4),
    (p_user_id, 'dashboard.categories.subscriptions', 'repeat',          '#6b38d4', 'expense', true, 5),
    (p_user_id, 'dashboard.categories.other',         'more-horizontal', '#494454', 'expense', true, 99);
end;
$$ language plpgsql;

-- Update handle_new_user to also seed categories
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  default_currency text := coalesce(new.raw_user_meta_data->>'default_currency', 'TRY');
  default_locale text := coalesce(new.raw_user_meta_data->>'locale', 'tr');
begin
  -- profile (existing)
  insert into public.profiles (id, email, locale, default_currency)
  values (new.id, new.email, default_locale, default_currency);

  -- seed default categories (new)
  perform public.seed_default_categories(new.id);

  return new;
end;
$$ language plpgsql;

-- Trigger zaten 0001'de var, sadece function updated
-- (drop+recreate trigger güvenlik için yapılabilir ama gerek yok)

-- ──────────────────────────────────────────────
-- BACKFILL: mevcut kullanıcılar için defaults
-- ──────────────────────────────────────────────

do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    if not exists (select 1 from public.categories where user_id = u.id) then
      perform public.seed_default_categories(u.id);
    end if;
  end loop;
end;
$$;
