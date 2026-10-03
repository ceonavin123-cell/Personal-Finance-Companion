begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  currency text not null default 'NPR',
  language text not null default 'en',
  timezone text not null default 'Asia/Kathmandu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint categories_default_owner_check
    check ((is_default and user_id is null) or (not is_default and user_id is not null))
);

create unique index if not exists categories_default_name_type_unique
  on public.categories (name, type) where user_id is null;
create index if not exists categories_user_type_idx
  on public.categories (user_id, type);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'NPR',
  description text,
  merchant text,
  transaction_date timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'text', 'voice')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_user_type_date_idx
  on public.transactions (user_id, type, transaction_date desc);

insert into public.categories (name, type, icon, is_default)
values
  ('Salary', 'income', 'briefcase', true),
  ('Business', 'income', 'store', true),
  ('Freelance', 'income', 'laptop', true),
  ('Interest', 'income', 'trending-up', true),
  ('Gift', 'income', 'gift', true),
  ('Refund', 'income', 'rotate-ccw', true),
  ('Other income', 'income', 'circle-help', true),
  ('Food', 'expense', 'utensils', true),
  ('Housing', 'expense', 'house', true),
  ('Transport', 'expense', 'bus', true),
  ('Bills', 'expense', 'receipt', true),
  ('Health', 'expense', 'heart-pulse', true),
  ('Education', 'expense', 'book-open', true),
  ('Shopping', 'expense', 'shopping-bag', true),
  ('Entertainment', 'expense', 'clapperboard', true),
  ('Personal', 'expense', 'user-round', true),
  ('Other expense', 'expense', 'circle-help', true)
on conflict (name, type) where user_id is null do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists categories_read_available on public.categories;
create policy categories_read_available on public.categories
  for select to authenticated using (is_default or user_id = (select auth.uid()));
drop policy if exists categories_create_own on public.categories;
create policy categories_create_own on public.categories
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not is_default);
drop policy if exists categories_update_own on public.categories;
create policy categories_update_own on public.categories
  for update to authenticated using (user_id = (select auth.uid()) and not is_default)
  with check (user_id = (select auth.uid()) and not is_default);
drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own on public.categories
  for delete to authenticated using (user_id = (select auth.uid()) and not is_default);

drop policy if exists transactions_manage_own on public.transactions;
create policy transactions_manage_own on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog, public'
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.get_dashboard_summary()
returns table (
  lifetime_income numeric,
  lifetime_expenses numeric,
  recorded_balance numeric,
  month_income numeric,
  month_expenses numeric,
  month_transaction_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0),
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0),
    coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0),
    coalesce(sum(t.amount) filter (
      where t.type = 'income'
        and t.transaction_date >= (
          pg_catalog.date_trunc('month', pg_catalog.timezone('Asia/Kathmandu', pg_catalog.now()))
          at time zone 'Asia/Kathmandu'
        )
    ), 0),
    coalesce(sum(t.amount) filter (
      where t.type = 'expense'
        and t.transaction_date >= (
          pg_catalog.date_trunc('month', pg_catalog.timezone('Asia/Kathmandu', pg_catalog.now()))
          at time zone 'Asia/Kathmandu'
        )
    ), 0),
    count(*) filter (
      where t.transaction_date >= (
        pg_catalog.date_trunc('month', pg_catalog.timezone('Asia/Kathmandu', pg_catalog.now()))
        at time zone 'Asia/Kathmandu'
      )
    )
  from public.transactions as t
  where t.user_id = auth.uid();
$$;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;

commit;