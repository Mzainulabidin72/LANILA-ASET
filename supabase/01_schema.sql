-- =====================================================================
-- LANILA ASET - Skema Database (aman untuk project Supabase yang sudah dipakai app lain)
-- Semua objek diberi prefix "aset_" supaya TIDAK bentrok dengan tabel/fungsi lama
-- (profiles, categories, audit_logs, dll milik aplikasi lain).
-- TIDAK menyentuh auth.users dan TIDAK membuat trigger di auth.
-- Urutan: 01_schema.sql -> 02_rls.sql -> 03_seed.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUM ----------
do $$ begin create type public.aset_user_role as enum ('admin','staff','viewer');
exception when duplicate_object then null; end $$;
do $$ begin create type public.aset_condition as enum ('baik','rusak_ringan','rusak_berat','hilang');
exception when duplicate_object then null; end $$;
do $$ begin create type public.aset_status as enum ('aktif','dipinjam','perawatan','dihapus');
exception when duplicate_object then null; end $$;
do $$ begin create type public.aset_loan_status as enum ('dipinjam','dikembalikan','terlambat');
exception when duplicate_object then null; end $$;
do $$ begin create type public.aset_maintenance_status as enum ('terjadwal','selesai','dibatalkan');
exception when duplicate_object then null; end $$;

create or replace function public.aset_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- PROFIL AKSES LANILA ASET ----------
-- Hanya user yang ada di tabel ini yang boleh masuk ke LANILA ASET.
create table if not exists public.aset_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  role       public.aset_user_role not null default 'viewer',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_aset_profiles_updated on public.aset_profiles;
create trigger trg_aset_profiles_updated before update on public.aset_profiles
  for each row execute function public.aset_set_updated_at();

-- Helper role untuk RLS (SECURITY DEFINER agar tidak rekursif). NULL = tidak punya akses.
create or replace function public.aset_current_role()
returns public.aset_user_role language sql stable security definer set search_path = public as $$
  select role from public.aset_profiles where id = auth.uid() and is_active = true
$$;

-- ---------- MASTER DATA ----------
create table if not exists public.aset_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.aset_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.aset_employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  employee_number text unique,
  position text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_aset_categories_updated on public.aset_categories;
create trigger trg_aset_categories_updated before update on public.aset_categories
  for each row execute function public.aset_set_updated_at();
drop trigger if exists trg_aset_locations_updated on public.aset_locations;
create trigger trg_aset_locations_updated before update on public.aset_locations
  for each row execute function public.aset_set_updated_at();
drop trigger if exists trg_aset_employees_updated on public.aset_employees;
create trigger trg_aset_employees_updated before update on public.aset_employees
  for each row execute function public.aset_set_updated_at();

-- ---------- ASSETS ----------
create sequence if not exists public.aset_code_seq start 1;

create table if not exists public.aset_assets (
  id                      uuid primary key default gen_random_uuid(),
  asset_code              text not null unique,
  name                    text not null,
  category_id             uuid references public.aset_categories(id) on delete set null,
  brand                   text,
  model                   text,
  serial_number           text,
  acquisition_date        date,
  acquisition_price       numeric(15,2) not null default 0 check (acquisition_price >= 0),
  location_id             uuid references public.aset_locations(id) on delete set null,
  responsible_employee_id uuid references public.aset_employees(id) on delete set null,
  condition               public.aset_condition not null default 'baik',
  status                  public.aset_status not null default 'aktif',
  photo_path              text,
  notes                   text,
  created_by              uuid references auth.users(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create or replace function public.aset_generate_code()
returns trigger language plpgsql as $$
begin
  if new.asset_code is null or new.asset_code = '' then
    new.asset_code := 'LAN-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.aset_code_seq')::text, 5, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_aset_assets_code on public.aset_assets;
create trigger trg_aset_assets_code before insert on public.aset_assets
  for each row execute function public.aset_generate_code();
drop trigger if exists trg_aset_assets_updated on public.aset_assets;
create trigger trg_aset_assets_updated before update on public.aset_assets
  for each row execute function public.aset_set_updated_at();

create index if not exists idx_aset_assets_category  on public.aset_assets(category_id);
create index if not exists idx_aset_assets_location  on public.aset_assets(location_id);
create index if not exists idx_aset_assets_employee  on public.aset_assets(responsible_employee_id);
create index if not exists idx_aset_assets_status    on public.aset_assets(status);
create index if not exists idx_aset_assets_condition on public.aset_assets(condition);
create index if not exists idx_aset_assets_created   on public.aset_assets(created_at desc);
create index if not exists idx_aset_assets_search    on public.aset_assets
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(asset_code,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(brand,'')));

-- ---------- LOANS ----------
create table if not exists public.aset_loans (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references public.aset_assets(id) on delete restrict,
  employee_id   uuid not null references public.aset_employees(id) on delete restrict,
  loan_date     date not null default current_date,
  due_date      date,
  return_date   date,
  status        public.aset_loan_status not null default 'dipinjam',
  condition_out public.aset_condition,
  condition_in  public.aset_condition,
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (due_date is null or due_date >= loan_date),
  check (return_date is null or return_date >= loan_date)
);
drop trigger if exists trg_aset_loans_updated on public.aset_loans;
create trigger trg_aset_loans_updated before update on public.aset_loans
  for each row execute function public.aset_set_updated_at();

create index if not exists idx_aset_loans_asset    on public.aset_loans(asset_id);
create index if not exists idx_aset_loans_employee on public.aset_loans(employee_id);
create index if not exists idx_aset_loans_status   on public.aset_loans(status);
create index if not exists idx_aset_loans_due      on public.aset_loans(due_date) where return_date is null;
create unique index if not exists uq_aset_loans_one_active
  on public.aset_loans(asset_id) where return_date is null;

create or replace function public.aset_sync_loan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.return_date is null then
    if exists (select 1 from public.aset_assets where id = new.asset_id and status <> 'aktif') then
      raise exception 'Aset tidak berstatus Aktif, tidak dapat dipinjam';
    end if;
    update public.aset_assets set status = 'dipinjam' where id = new.asset_id;
  elsif tg_op = 'UPDATE' and old.return_date is null and new.return_date is not null then
    new.status := 'dikembalikan';
    update public.aset_assets
       set status = 'aktif', condition = coalesce(new.condition_in, condition)
     where id = new.asset_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_aset_loans_sync_ins on public.aset_loans;
create trigger trg_aset_loans_sync_ins after insert on public.aset_loans
  for each row execute function public.aset_sync_loan();
drop trigger if exists trg_aset_loans_sync_upd on public.aset_loans;
create trigger trg_aset_loans_sync_upd before update on public.aset_loans
  for each row execute function public.aset_sync_loan();

-- ---------- MAINTENANCES ----------
create table if not exists public.aset_maintenances (
  id             uuid primary key default gen_random_uuid(),
  asset_id       uuid not null references public.aset_assets(id) on delete cascade,
  title          text not null,
  description    text,
  scheduled_date date not null,
  completed_date date,
  interval_days  integer check (interval_days is null or interval_days > 0),
  cost           numeric(15,2) not null default 0 check (cost >= 0),
  status         public.aset_maintenance_status not null default 'terjadwal',
  performed_by   text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists trg_aset_maint_updated on public.aset_maintenances;
create trigger trg_aset_maint_updated before update on public.aset_maintenances
  for each row execute function public.aset_set_updated_at();

create index if not exists idx_aset_maint_asset on public.aset_maintenances(asset_id);
create index if not exists idx_aset_maint_sched on public.aset_maintenances(scheduled_date) where status = 'terjadwal';

-- ---------- AUDIT LOG ----------
create table if not exists public.aset_audit_logs (
  id          bigint generated always as identity primary key,
  asset_id    uuid,
  entity_type text not null,
  entity_id   uuid not null,
  action      text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_aset_audit_asset   on public.aset_audit_logs(asset_id, created_at desc);
create index if not exists idx_aset_audit_created on public.aset_audit_logs(created_at desc);

create or replace function public.aset_log_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_row jsonb; v_id uuid; v_asset uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := (v_row->>'id')::uuid;
  v_asset := case when tg_table_name = 'aset_assets' then v_id else (v_row->>'asset_id')::uuid end;
  insert into public.aset_audit_logs (asset_id, entity_type, entity_id, action, old_data, new_data, changed_by)
  values (v_asset, tg_table_name, v_id, tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          auth.uid());
  return null;
end $$;

drop trigger if exists trg_aset_audit_assets on public.aset_assets;
create trigger trg_aset_audit_assets after insert or update or delete on public.aset_assets
  for each row execute function public.aset_log_changes();
drop trigger if exists trg_aset_audit_loans on public.aset_loans;
create trigger trg_aset_audit_loans after insert or update or delete on public.aset_loans
  for each row execute function public.aset_log_changes();
drop trigger if exists trg_aset_audit_maint on public.aset_maintenances;
create trigger trg_aset_audit_maint after insert or update or delete on public.aset_maintenances
  for each row execute function public.aset_log_changes();

-- ---------- VIEW: perawatan jatuh tempo ----------
create or replace view public.aset_v_maintenance_due
with (security_invoker = true) as
select m.id, m.asset_id, a.asset_code, a.name as asset_name, m.title, m.scheduled_date,
       (m.scheduled_date < current_date) as is_overdue
from public.aset_maintenances m
join public.aset_assets a on a.id = m.asset_id
where m.status = 'terjadwal' and m.scheduled_date <= current_date + interval '7 days';
