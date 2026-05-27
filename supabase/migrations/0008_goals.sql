create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 100),
  target_amount numeric(15,2) not null check (target_amount > 0),
  current_amount numeric(15,2) not null default 0 check (current_amount >= 0),
  currency text not null check (currency in ('TRY','USD','EUR')),
  target_date date,
  icon_key text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_user_target_date_idx
  on public.goals(user_id, target_date) where target_date is not null;

alter table public.goals enable row level security;

drop policy if exists "Users view own goals" on public.goals;
create policy "Users view own goals" on public.goals for select using (auth.uid() = user_id);
drop policy if exists "Users insert own goals" on public.goals;
create policy "Users insert own goals" on public.goals for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own goals" on public.goals;
create policy "Users update own goals" on public.goals for update using (auth.uid() = user_id);
drop policy if exists "Users delete own goals" on public.goals;
create policy "Users delete own goals" on public.goals for delete using (auth.uid() = user_id);

create or replace function public.handle_goal_completion()
returns trigger language plpgsql as $$
begin
  if new.current_amount >= new.target_amount and old.completed_at is null then
    new.completed_at := now();
  elsif new.current_amount < new.target_amount then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_goal_change on public.goals;
create trigger on_goal_change
  before insert or update on public.goals
  for each row execute procedure public.handle_goal_completion();

drop trigger if exists on_goal_updated on public.goals;
create trigger on_goal_updated
  before update on public.goals
  for each row execute procedure public.handle_updated_at();
