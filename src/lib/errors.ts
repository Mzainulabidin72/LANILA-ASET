/** Ubah error Supabase/jaringan menjadi pesan Bahasa Indonesia yang jelas. */
export function errorMessage(e: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Anda sedang offline. Perubahan belum bisa disimpan.'
  }
  const err = e as { code?: string; message?: string } | null
  const msg = err?.message ?? ''
  const code = err?.code ?? ''

  // Hanya saat pengembangan (localhost): tampilkan galat asli di Console untuk diagnosis.
  // Tidak dicetak di produksi karena pesan database bisa memuat nilai baris.
  if (import.meta.env.DEV && (code || msg)) console.error('[LANILA] galat dari server:', { code, message: msg })

  if (code === '42501') return 'Anda tidak punya izin untuk tindakan ini.'
  if (code === '23505') {
    if (msg.includes('uq_aset_loans_one_active')) return 'Aset ini masih dalam peminjaman aktif.'
    return 'Data dengan nilai yang sama sudah ada.'
  }
  if (code === '23503') return 'Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.'
  // Kolom/tabel belum ada: migrasi database belum dijalankan, atau cache skema belum dimuat ulang
  if (code === 'PGRST204' || code === 'PGRST205' || code === '42703' || code === '42P01') {
    return 'Database belum diperbarui untuk fitur ini. Jalankan supabase/04_wealth.sql di Supabase SQL Editor, lalu muat ulang halaman. Jika sudah, jalankan: notify pgrst, \'reload schema\';'
  }
  if (code === '23514') return 'Data melanggar aturan database (mis. angka negatif atau mata uang bukan 3 huruf). Periksa isian Anda.'
  if (code === '22003') return 'Angka terlalu besar untuk disimpan.'
  if (code === '22P02') return 'Ada isian dengan format yang tidak valid.'
  if (msg.includes('tidak berstatus Aktif')) return 'Aset tidak berstatus Aktif sehingga tidak dapat dipinjam.'
  if (msg.includes('Failed to fetch')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  if (/exceeded|too large/i.test(msg)) return 'Ukuran file terlalu besar.'
  // Pesan umum + kode galat (kode tidak sensitif) supaya mudah dilacak
  return code ? `${fallback} (kode galat: ${code})` : fallback
}
