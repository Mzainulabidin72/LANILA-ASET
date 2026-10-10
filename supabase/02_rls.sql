-- =====================================================================
-- LANILA ASET - Row Level Security (hanya untuk tabel aset_*)
--   admin : semua akses | staff : baca + tambah/ubah | viewer : baca saja
--   User yang TIDAK ada di aset_profiles (mis. user aplikasi lain) => ditolak semua.
-- Aman dijalankan ulang (policy di-drop dulu).
-- =====================================================================

alter table public.aset_profiles     enable row level security;
alter table public.aset_categories   enable row level security;
alter table public.aset_locations    enable row level security;
alter table public.aset_employees    enable row level security;
alter table public.aset_assets       enable row level security;
alter table public.aset_loans        enable row level security;
alter table public.aset_maintenances enable row level security;
alter table public.aset_audit_logs   enable row level security;

-- ---------- PROFIL ----------
drop policy if exists "aset_profiles select" on public.aset_profiles;
create policy "aset_profiles select" on public.aset_profiles for select to authenticated
  using (id = auth.uid() or public.aset_current_role() = 'admin');
drop policy if exists "aset_profiles admin insert" on public.aset_profiles;
create policy "aset_profiles admin insert" on public.aset_profiles for insert to authenticated
  with check (public.aset_current_role() = 'admin');
drop policy if exists "aset_profiles admin update" on public.aset_profiles;
create policy "aset_profiles admin update" on public.aset_profiles for update to authenticated
  using (public.aset_current_role() = 'admin') with check (public.aset_current_role() = 'admin');
drop policy if exists "aset_profiles admin delete" on public.aset_profiles;
create policy "aset_profiles admin delete" on public.aset_profiles for delete to authenticated
  using (public.aset_current_role() = 'admin');

-- ---------- TABEL DATA (master, aset, pinjam, perawatan) ----------
do $$
declare t text;
begin
  foreach t in array array['aset_categories','aset_locations','aset_employees','aset_assets','aset_loans','aset_maintenances'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$s', t);
    execute format('create policy "%1$s read" on public.%1$s for select to authenticated using (public.aset_current_role() is not null)', t);
    execute format('create policy "%1$s insert" on public.%1$s for insert to authenticated with check (public.aset_current_role() in (''admin'',''staff''))', t);
    execute format('create policy "%1$s update" on public.%1$s for update to authenticated using (public.aset_current_role() in (''admin'',''staff'')) with check (public.aset_current_role() in (''admin'',''staff''))', t);
    execute format('create policy "%1$s delete" on public.%1$s for delete to authenticated using (public.aset_current_role() = ''admin'')', t);
  end loop;
end $$;

-- ---------- AUDIT LOG: hanya baca (admin & staf); penulisan lewat trigger ----------
drop policy if exists "aset_audit_logs read" on public.aset_audit_logs;
create policy "aset_audit_logs read" on public.aset_audit_logs for select to authenticated
  using (public.aset_current_role() in ('admin','staff'));

-- ---------- STORAGE: foto aset (bucket baru, tidak mengganggu bucket lain) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aset-photos', 'aset-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "aset-photos read" on storage.objects;
create policy "aset-photos read" on storage.objects for select to authenticated
  using (bucket_id = 'aset-photos' and public.aset_current_role() is not null);
drop policy if exists "aset-photos insert" on storage.objects;
create policy "aset-photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'aset-photos' and public.aset_current_role() in ('admin','staff'));
drop policy if exists "aset-photos update" on storage.objects;
create policy "aset-photos update" on storage.objects for update to authenticated
  using (bucket_id = 'aset-photos' and public.aset_current_role() in ('admin','staff'));
drop policy if exists "aset-photos delete" on storage.objects;
create policy "aset-photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'aset-photos' and public.aset_current_role() = 'admin');
