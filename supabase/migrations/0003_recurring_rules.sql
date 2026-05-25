-- ====================================================================
-- FynPad — Part 6: Recurring Rules + Scheduled Job
-- ====================================================================

-- ──────────────────────────────────────────────
-- RECURRING_RULES TABLE
-- ──────────────────────────────────────────────

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid not null references public.categories on delete restrict,
  amount numeric(15,2) not null check (amount > 0),
  currency text not null check (currency in ('TRY','USD','EUR')),
  kind text not null check (kind in ('income','expense')),
  note text,

  -- Frequency
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  day_of_week int check (day_of_week between 0 and 6),    -- weekly: 0=Pazar … 6=Cumartesi (Postgres EXTRACT(DOW) ile aynı)
  day_of_month int check (day_of_month between 1 and 31), -- monthly + yearly
  month_of_year int check (month_of_year between 1 and 12), -- yearly

  -- Validity period
  start_date date not null,
  end_date date,             -- NULL = süresiz
  last_generated_date date,  -- en son işlem üretilen tarih (yalnızca ileri gider)

  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- frequency'e göre ilgili gün field'ı zorunlu
  constraint freq_fields_check check (
    (frequency = 'daily') or
    (frequency = 'weekly' and day_of_week is not null) or
    (frequency = 'monthly' and day_of_month is not null) or
    (frequency = 'yearly' and day_of_month is not null and month_of_year is not null)
  ),

  -- end_date varsa start_date'ten küçük olamaz
  constraint end_after_start check (end_date is null or end_date >= start_date)
);

create index if not exists recurring_rules_user_id_idx on public.recurring_rules(user_id);
create index if not exists recurring_rules_active_idx on public.recurring_rules(active);

alter table public.recurring_rules enable row level security;

drop policy if exists "Users view own recurring rules" on public.recurring_rules;
create policy "Users view own recurring rules"
  on public.recurring_rules for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own recurring rules" on public.recurring_rules;
create policy "Users insert own recurring rules"
  on public.recurring_rules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own recurring rules" on public.recurring_rules;
create policy "Users update own recurring rules"
  on public.recurring_rules for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own recurring rules" on public.recurring_rules;
create policy "Users delete own recurring rules"
  on public.recurring_rules for delete
  using (auth.uid() = user_id);

drop trigger if exists on_recurring_rule_updated on public.recurring_rules;
create trigger on_recurring_rule_updated
  before update on public.recurring_rules
  for each row execute procedure public.handle_updated_at();

-- ──────────────────────────────────────────────
-- transactions.recurring_rule_id FK
-- ──────────────────────────────────────────────
--
-- Part 5'te recurring_rule_id sütunu eklenmişti ama FK yoktu (tablo henüz yoktu).
-- Şimdi FK ekleniyor. ON DELETE SET NULL: kural silinince ondan üretilmiş GEÇMİŞ
-- transaction'lar SİLİNMEZ, yalnızca recurring_rule_id NULL'a düşer
-- (brief 4.3: "geçmiş kayıtlar olduğu gibi kalır" — repeat ikonu kaybolur, veri durur).

alter table public.transactions
  drop constraint if exists transactions_recurring_rule_id_fkey;

alter table public.transactions
  add constraint transactions_recurring_rule_id_fkey
  foreign key (recurring_rule_id) references public.recurring_rules(id) on delete set null;

create index if not exists transactions_recurring_rule_id_idx
  on public.transactions(recurring_rule_id) where recurring_rule_id is not null;

-- ──────────────────────────────────────────────
-- HELPER: bu kural bu tarihte ateşler mi?
-- ──────────────────────────────────────────────

create or replace function public.recurring_rule_fires_on(
  p_rule public.recurring_rules,
  p_date date
) returns boolean
language plpgsql
immutable
as $$
declare
  effective_dom int;
  last_day int;
begin
  -- Geçerli tarih aralığında mı?
  if p_date < p_rule.start_date then return false; end if;
  if p_rule.end_date is not null and p_date > p_rule.end_date then return false; end if;

  case p_rule.frequency
    when 'daily' then
      return true;

    when 'weekly' then
      return extract(dow from p_date)::int = p_rule.day_of_week;

    when 'monthly' then
      -- 31. gün gibi değerlerde: o ay o kadar gün çekmiyorsa son güne sığdır.
      last_day := extract(day from (date_trunc('month', p_date) + interval '1 month - 1 day'))::int;
      effective_dom := least(p_rule.day_of_month, last_day);
      return extract(day from p_date)::int = effective_dom;

    when 'yearly' then
      -- 29 Şubat: leap olmayan yılda 28'e düşür.
      last_day := extract(day from (
        make_date(extract(year from p_date)::int, p_rule.month_of_year, 1) + interval '1 month - 1 day'
      ))::int;
      effective_dom := least(p_rule.day_of_month, last_day);
      return extract(month from p_date)::int = p_rule.month_of_year
        and extract(day from p_date)::int = effective_dom;

    else
      return false;
  end case;
end;
$$;

-- ──────────────────────────────────────────────
-- MAIN: bir kullanıcı için kuralları p_target_date'e kadar işle
-- ──────────────────────────────────────────────
--
-- Idempotent: aynı (rule_id, date) için zaten transaction varsa atlar.
-- last_generated_date'i ileri taşır. start_date'ten p_target_date'e kadar
-- eksik tüm günler için catch-up yapar. last_generated_date asla geriye çekilmez.

create or replace function public.process_recurring_rules(
  p_user_id uuid,
  p_target_date date default current_date
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.recurring_rules%rowtype;
  cur_date date;
  upto date;
  created_count int := 0;
  already_exists boolean;
begin
  for r in
    select * from public.recurring_rules
    where user_id = p_user_id
      and active = true
      and start_date <= p_target_date
      and (end_date is null or end_date >= start_date)
  loop
    -- Başlanacak gün: start_date ile (son üretilen + 1) arasında ileri olan.
    cur_date := greatest(
      r.start_date,
      coalesce(r.last_generated_date + interval '1 day', r.start_date)::date
    );
    -- İşlenecek son gün: target ve (varsa) end_date'in küçüğü.
    upto := least(p_target_date, coalesce(r.end_date, p_target_date));

    while cur_date <= upto loop
      if public.recurring_rule_fires_on(r, cur_date) then
        -- Çoklu çalıştırmaya karşı koruma: aynı rule + date için zaten var mı?
        select exists(
          select 1 from public.transactions
          where recurring_rule_id = r.id and date = cur_date
        ) into already_exists;

        if not already_exists then
          insert into public.transactions (
            user_id, category_id, amount, currency, kind, date, note, recurring_rule_id
          ) values (
            r.user_id, r.category_id, r.amount, r.currency, r.kind, cur_date, r.note, r.id
          );
          created_count := created_count + 1;
        end if;
      end if;

      cur_date := cur_date + interval '1 day';
    end loop;

    -- Son işlenen tarihi yalnızca ileri taşı.
    if upto >= r.start_date then
      update public.recurring_rules
      set last_generated_date = greatest(coalesce(last_generated_date, upto), upto)
      where id = r.id;
    end if;
  end loop;

  return created_count;
end;
$$;

-- ──────────────────────────────────────────────
-- App'ten çağrılan RLS-dostu sarmalayıcı (auth.uid() implicit)
-- ──────────────────────────────────────────────
--
-- p_user_id'yi expose etmemek için: client `process_my_recurring_rules` çağırır,
-- fonksiyon oturum kullanıcısını kendisi belirler.

create or replace function public.process_my_recurring_rules(
  p_target_date date default current_date
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  return public.process_recurring_rules(current_user_id, p_target_date);
end;
$$;

-- ──────────────────────────────────────────────
-- CRON: tüm kullanıcılar için gece işleme (00:05 UTC)
-- ──────────────────────────────────────────────

create or replace function public.process_recurring_rules_all_users()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  total_created int := 0;
begin
  for u in select distinct user_id from public.recurring_rules where active = true loop
    total_created := total_created + public.process_recurring_rules(u.user_id, current_date);
  end loop;
  return total_created;
end;
$$;

-- pg_cron schedule — extension Dashboard → Database → Extensions'tan ENABLE
-- edildikten sonra bu blok başarıyla çalışır. Daha önce schedule edilmişse
-- unschedule + schedule yapar. Extension yoksa NOTICE verir, hata fırlatmaz.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('fynpad-recurring-rules')
      where exists (select 1 from cron.job where jobname = 'fynpad-recurring-rules');

    perform cron.schedule(
      'fynpad-recurring-rules',
      '5 0 * * *',
      $cron$select public.process_recurring_rules_all_users()$cron$
    );
  else
    raise notice 'pg_cron extension not enabled — schedule skipped. Enable from Dashboard → Database → Extensions, then re-run this migration.';
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped (%). Enable pg_cron, then re-run.', sqlerrm;
end;
$$;
