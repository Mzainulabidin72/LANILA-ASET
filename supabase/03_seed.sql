-- Data contoh (opsional) - aman dijalankan ulang
insert into public.aset_categories (name, description) values
  ('Elektronik','Laptop, printer, proyektor, dll'),
  ('Furnitur','Meja, kursi, lemari'),
  ('Kendaraan','Mobil dan motor operasional'),
  ('Peralatan Kantor','ATK dan perlengkapan umum')
on conflict (name) do nothing;

insert into public.aset_locations (name) values
  ('Kantor Pusat - Lantai 1'),('Kantor Pusat - Lantai 2'),('Gudang')
on conflict (name) do nothing;

-- =====================================================================
-- DAFTARKAN DIRI ANDA SEBAGAI ADMIN LANILA ASET (wajib, sekali saja)
-- Pakai akun yang SUDAH ada di Authentication -> Users. Ganti email bila perlu:
-- =====================================================================
insert into public.aset_profiles (id, full_name, role, is_active)
select id, 'Abidin', 'admin', true
from auth.users
where email = 'mzainulabidin72@gmail.com'
on conflict (id) do update set role = 'admin', is_active = true;

-- Untuk memberi akses user lain (ganti email & role: admin / staff / viewer):
-- insert into public.aset_profiles (id, full_name, role)
-- select id, 'Nama Staf', 'staff' from auth.users where email = 'staf@contoh.com'
-- on conflict (id) do update set role = excluded.role, is_active = true;
