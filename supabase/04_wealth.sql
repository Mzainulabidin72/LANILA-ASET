-- =====================================================================
-- LANILA ASET - Modul Kekayaan Pribadi (migrasi ADITIF, aman dijalankan ulang)
--   * Memperluas aset_assets: jenis aset, mata uang, institusi, jumlah, harga/nilai terkini, dll.
--   * Menambah aset_valuations: riwayat nilai/saldo/harga.
--   * Visibilitas: 'shared' (inventaris bersama, sesuai role) atau 'private' (hanya pemilik).
--   * Data lama TIDAK berubah: semua baris lama menjadi class 'valuable' + visibility 'shared'.
-- Jalankan SETELAH 01_schema.sql dan 02_rls.sql.
-- =====================================================================

-- ---------- 1) Kolom baru pada aset_assets ----------
alter table public.aset_assets
  add column if not exists asset_class      text          not null default 'valuable',
  add column if not exists visibility       text          not null default 'shared',
  add column if not exists owner_id         uuid          references auth.users(id) on delete set null,
  add column if not exists currency         text          not null default 'IDR',
  add column if not exists institution      text,
  add column if not exists symbol           text,
  add column if not exists account_last4    text,
  add column if not exists quantity         numeric(24,8),
  add column if not exists fees             numeric(20,2),
  add column if not exists current_unit_price numeric(24,8),
  add column if not exists current_value    numeric(20,2),
  add column if not exists fx_rate          numeric(20,6),
  add column if not exists valuation_source text          not null default 'manual',
  add column if not exists valued_at        timestamptz,
  add column if not exists valuation_note   text,
  add column if not exists interest_rate    numeric(7,4),
  add column if not exists maturity_date    date,
  add column if not exists extra            jsonb         not null default '{}'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'aset_assets_class_chk') then
    alter table public.aset_assets add constraint aset_assets_class_chk
      check (asset_class in ('cash','stock','fund','deposit','gold','crypto','property','vehicle','valuable','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'aset_assets_visibility_chk') then
    alter table public.aset_assets add constraint aset_assets_visibility_chk
      check (visibility in ('shared','private'));
  end if;
  -- Aset keuangan SELALU pribadi; aset pribadi harus punya pemilik.
  if not exists (select 1 from pg_constraint where conname = 'aset_assets_private_fin_chk') then
    alter table public.aset_assets add constraint aset_assets_private_fin_chk
      check (asset_class in ('property','vehicle','valuable','other') or visibility = 'private');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'aset_assets_private_owner_chk') then
    alter table public.aset_assets add constraint aset_assets_private_owner_chk
      check (visibility = 'shared' or owner_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'aset_assets_source_chk') then
    alter table public.aset_assets add constraint aset_assets_source_chk
      check (valuation_source in ('manual','live','delayed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'aset_assets_money_chk') then
    alter table public.aset_assets add constraint aset_assets_money_chk
      check ((quantity is null or quantity >= 0) and (fees is null or fees >= 0)
         and (current_unit_price is null or current_unit_price >= 0)
         and (current_value is null or current_value >= 0)
         and (fx_rate is null or fx_rate > 0)
         and char_length(currency) = 3
         and (account_last4 is null or account_last4 ~ '^[0-9A-Za-z]{1,4}$'));
  end if;
end $$;

create index if not exists idx_aset_assets_class      on public.aset_assets(asset_class);
create index if not exists idx_aset_assets_owner      on public.aset_assets(owner_id);
create index if not exists idx_aset_assets_visibility on public.aset_assets(visibility);

-- ---------- 2) Riwayat nilai ----------
create table if not exists public.aset_valuations (
  id         uuid primary key default gen_random_uuid(),
  asset_id   uuid not null references public.aset_assets(id) on delete cascade,
  value      numeric(20,2) not null,           -- total nilai dalam mata uang aset
  unit_price numeric(24,8),
  quantity   numeric(24,8),
  currency   text not null,
  source     text not null default 'manual' check (source in ('manual','live','delayed')),
  note       text,
  valued_at  timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_aset_valuations_asset on public.aset_valuations(asset_id, valued_at desc);

-- Catat otomatis setiap kali jumlah / harga / nilai berubah (termasuk lewat antrean offline).
create or replace function public.aset_record_valuation()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_total numeric(20,2);
begin
  v_total := case
    when new.quantity is not null and new.current_unit_price is not null then round(new.quantity * new.current_unit_price, 2)
    else new.current_value
  end;
  if v_total is null then return null; end if;

  if tg_op = 'UPDATE'
     and old.quantity is not distinct from new.quantity
     and old.current_unit_price is not distinct from new.current_unit_price
     and old.current_value is not distinct from new.current_value
     and old.valued_at is not distinct from new.valued_at then
    return null;
  end if;

  insert into public.aset_valuations (asset_id, value, unit_price, quantity, currency, source, note, valued_at, created_by)
  values (new.id, v_total, new.current_unit_price, new.quantity, new.currency, new.valuation_source,
          new.valuation_note, coalesce(new.valued_at, now()), auth.uid());
  return null;
end $$;

drop trigger if exists trg_aset_assets_valuation on public.aset_assets;
create trigger trg_aset_assets_valuation after insert or update on public.aset_assets
  for each row execute function public.aset_record_valuation();

-- ---------- 3) RLS aset_assets: aset pribadi hanya untuk pemilik ----------
drop policy if exists "aset_assets read"   on public.aset_assets;
drop policy if exists "aset_assets insert" on public.aset_assets;
drop policy if exists "aset_assets update" on public.aset_assets;
drop policy if exists "aset_assets delete" on public.aset_assets;

-- Baca: inventaris bersama (semua role aktif) ATAU milik sendiri.
create policy "aset_assets read" on public.aset_assets for select to authenticated
  using (public.aset_current_role() is not null
         and (visibility = 'shared' or owner_id = auth.uid()));

-- Tulis aset bersama: Admin/Staf. Tulis aset pribadi: pemilik (role apa pun yang aktif).
create policy "aset_assets insert" on public.aset_assets for insert to authenticated
  with check (public.aset_current_role() is not null
              and ((visibility = 'shared' and public.aset_current_role() in ('admin','staff'))
                or (visibility = 'private' and owner_id = auth.uid())));

create policy "aset_assets update" on public.aset_assets for update to authenticated
  using (public.aset_current_role() is not null
         and ((visibility = 'shared' and public.aset_current_role() in ('admin','staff'))
           or (visibility = 'private' and owner_id = auth.uid())))
  with check (public.aset_current_role() is not null
              and ((visibility = 'shared' and public.aset_current_role() in ('admin','staff'))
                or (visibility = 'private' and owner_id = auth.uid())));

create policy "aset_assets delete" on public.aset_assets for delete to authenticated
  using (public.aset_current_role() is not null
         and ((visibility = 'shared' and public.aset_current_role() = 'admin')
           or (visibility = 'private' and owner_id = auth.uid())));

-- ---------- 4) RLS riwayat nilai: mengikuti hak baca aset induknya ----------
alter table public.aset_valuations enable row level security;
drop policy if exists "aset_valuations read" on public.aset_valuations;
create policy "aset_valuations read" on public.aset_valuations for select to authenticated
  using (exists (select 1 from public.aset_assets a where a.id = asset_id));  -- RLS aset_assets ikut berlaku
-- Penulisan hanya lewat trigger (security definer): tidak ada policy insert/update/delete.

-- ---------- 5) Audit log tidak boleh membocorkan aset pribadi milik orang lain ----------
drop policy if exists "aset_audit_logs read" on public.aset_audit_logs;
create policy "aset_audit_logs read" on public.aset_audit_logs for select to authenticated
  using (public.aset_current_role() in ('admin','staff')
         and (asset_id is null
              or exists (select 1 from public.aset_assets a where a.id = asset_id)));

-- ---------- 6) Peminjaman & perawatan: jangan tampilkan data aset pribadi milik orang lain ----------
drop policy if exists "aset_loans read" on public.aset_loans;
create policy "aset_loans read" on public.aset_loans for select to authenticated
  using (public.aset_current_role() is not null
         and exists (select 1 from public.aset_assets a where a.id = asset_id));

drop policy if exists "aset_maintenances read" on public.aset_maintenances;
create policy "aset_maintenances read" on public.aset_maintenances for select to authenticated
  using (public.aset_current_role() is not null
         and exists (select 1 from public.aset_assets a where a.id = asset_id));
