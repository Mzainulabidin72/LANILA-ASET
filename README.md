# LANILA ASET (PWA)

Aplikasi manajemen aset/inventaris. React + Vite + TypeScript + Tailwind + Supabase + vite-plugin-pwa.

> Status: **Tahap 1 & 2 selesai** (struktur, database, setup PWA, layout, login/lupa password).
> Tahap 3-7 (dashboard data, CRUD aset + QR, pinjam/perawatan/laporan, offline sync, deploy) menyusul.

## Struktur folder
```
lanila-aset/
├─ public/                 favicon, ikon PWA (192, 512, maskable), robots.txt
├─ supabase/
│  ├─ 01_schema.sql        tabel, relasi, index, trigger (kode aset otomatis, audit log)
│  ├─ 02_rls.sql           Row Level Security per role + Storage bucket foto
│  └─ 03_seed.sql          data contoh + cara menjadikan diri sendiri Admin
├─ src/
│  ├─ components/
│  │  ├─ layout/           AppLayout, Sidebar (laptop), BottomNav (HP), ProtectedRoute
│  │  ├─ pwa/              InstallBanner, UpdatePrompt, OfflineBadge
│  │  └─ ui/               Logo, Skeleton, EmptyState, ErrorMessage, AuthShell
│  ├─ contexts/            AuthContext (login + role), ThemeContext (gelap/terang)
│  ├─ hooks/               useInstallPrompt, useOnlineStatus
│  ├─ lib/                 supabase.ts, format.ts (Rupiah, dd/mm/yyyy)
│  ├─ pages/               Login, ForgotPassword, ResetPassword, Dashboard, More, dll
│  ├─ types/database.ts    tipe TypeScript sesuai tabel
│  ├─ App.tsx, main.tsx, index.css
├─ .env.example · vite.config.ts · tailwind.config.js · vercel.json
```

## Cara menjalankan
1. Install Node.js 20+ (https://nodejs.org).
2. `npm install`
3. Buat project di https://supabase.com, lalu di **SQL Editor** jalankan berurutan:
   `supabase/01_schema.sql` → `02_rls.sql` → `03_seed.sql` (masing-masing **sekali saja**).
4. Supabase → Authentication → Users → **Add user** (email + password, centang auto confirm).
5. Jadikan akun itu Admin: jalankan SQL `update` yang ada di bagian bawah `03_seed.sql` (ganti email).
6. Salin `.env.example` → `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
   (Supabase → Project Settings → API).
7. `npm run dev` → buka http://localhost:5173

## Menguji PWA (service worker hanya aktif di build produksi)
```
npm run build
npm run preview
```
- **Laptop**: buka di Chrome → ikon Install muncul di address bar, atau banner "Install App".
- **HP (Android)**: HP & laptop satu Wi-Fi, buka `http://IP-LAPTOP:4173`. Install penuh butuh HTTPS,
  jadi paling mudah uji setelah deploy ke Vercel (Tahap 7).
- **iPhone**: Safari → Bagikan → *Add to Home Screen*.
- **Offline**: DevTools → Application → Service Workers → centang *Offline*, lalu reload.
- **Lighthouse**: DevTools → Lighthouse, jalankan pada build `preview`.
