-- ====================================================================
-- FynPad — Part 8: Category Budgets
-- ====================================================================

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  amount numeric(15,2) not null check (amount > 0),
  currency text not null check (currency in ('TRY','USD','EUR')),
  period_type text not null default 'monthly' check (period_type in ('monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Bir kullanıcının bir kategori + period_type için yalnızca 1 aktif bütçesi olabilir
  constraint user_category_period_unique unique (user_id, category_id, period_type)
);

create index if not exists category_budgets_user_id_idx on public.category_budgets(user_id);

alter table public.category_budgets enable row level security;

drop policy if exists "Users view own budgets" on public.category_budgets;
create policy "Users view own budgets"
  on public.category_budgets for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own budgets" on public.category_budgets;
create policy "Users insert own budgets"
  on public.category_budgets for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own budgets" on public.category_budgets;
create policy "Users update own budgets"
  on public.category_budgets for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own budgets" on public.category_budgets;
create policy "Users delete own budgets"
  on public.category_budgets for delete
  using (auth.uid() = user_id);

drop trigger if exists on_budget_updated on public.category_budgets;
create trigger on_budget_updated
  before update on public.category_budgets
  for each row execute procedure public.handle_updated_at();
