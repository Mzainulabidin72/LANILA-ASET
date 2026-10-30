-- =====================================================================
-- LANILA ASET - Hapus Master Data yang AMAN (migrasi aditif, aman dijalankan ulang)
--  1) Penjaga di database: kategori / lokasi / pegawai yang MASIH DIPAKAI tidak bisa dihapus.
--     (Sebelumnya, menghapus kategori/lokasi yang dipakai aset diam-diam mengosongkan kolomnya.)
--  2) Fungsi hitung pemakaian untuk tampilan "dipakai N aset".
-- Tidak mengubah tabel, kolom, maupun data yang ada.
-- =====================================================================

-- ---------- 1) Penjaga hapus ----------
create or replace function public.aset_guard_master_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare n_assets bigint := 0; n_loans bigint := 0;
begin
  -- security definer: menghitung SEMUA aset (termasuk aset pribadi pengguna lain) agar integritas terjaga
  if tg_table_name = 'aset_categories' then
    select count(*) into n_assets from public.aset_assets where category_id = old.id;
  elsif tg_table_name = 'aset_locations' then
    select count(*) into n_assets from public.aset_assets where location_id = old.id;
  elsif tg_table_name = 'aset_employees' then
    select count(*) into n_assets from public.aset_assets where responsible_employee_id = old.id;
    select count(*) into n_loans  from public.aset_loans  where employee_id = old.id;
  end if;

  if n_assets > 0 or n_loans > 0 then
    raise exception 'Data masih dipakai: % aset, % peminjaman', n_assets, n_loans using errcode = '23503';
  end if;
  return old;
end $$;

drop trigger if exists trg_aset_guard_cat_delete on public.aset_categories;
create trigger trg_aset_guard_cat_delete before delete on public.aset_categories
  for each row execute function public.aset_guard_master_delete();
drop trigger if exists trg_aset_guard_loc_delete on public.aset_locations;
create trigger trg_aset_guard_loc_delete before delete on public.aset_locations
  for each row execute function public.aset_guard_master_delete();
drop trigger if exists trg_aset_guard_emp_delete on public.aset_employees;
create trigger trg_aset_guard_emp_delete before delete on public.aset_employees
  for each row execute function public.aset_guard_master_delete();

-- ---------- 2) Hitung pemakaian ----------
-- Hanya mengembalikan JUMLAH per baris master (bukan isi aset), dan hanya untuk pengguna aktif LANILA ASET.
create or replace function public.aset_master_usage(p_kind text)
returns table (id uuid, asset_count bigint, loan_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.aset_current_role() is null then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;

  if p_kind = 'categories' then
    return query
      select c.id, count(a.id)::bigint, 0::bigint
      from public.aset_categories c left join public.aset_assets a on a.category_id = c.id
      group by c.id;
  elsif p_kind = 'locations' then
    return query
      select l.id, count(a.id)::bigint, 0::bigint
      from public.aset_locations l left join public.aset_assets a on a.location_id = l.id
      group by l.id;
  elsif p_kind = 'employees' then
    return query
      select e.id,
             (select count(*) from public.aset_assets a where a.responsible_employee_id = e.id)::bigint,
             (select count(*) from public.aset_loans  x where x.employee_id = e.id)::bigint
      from public.aset_employees e;
  else
    raise exception 'Jenis tidak dikenal' using errcode = '22023';
  end if;
end $$;

revoke all on function public.aset_master_usage(text) from public, anon;
grant execute on function public.aset_master_usage(text) to authenticated;
