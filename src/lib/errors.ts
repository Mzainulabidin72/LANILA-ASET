/** Ubah error Supabase/jaringan menjadi pesan Bahasa Indonesia yang jelas. */
export function errorMessage(e: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Anda sedang offline. Perubahan belum bisa disimpan.'
  }
  const err = e as { code?: string; message?: string } | null
  const msg = err?.message ?? ''
  if (err?.code === '42501') return 'Anda tidak punya izin untuk tindakan ini.'
  if (err?.code === '23505') {
    if (msg.includes('uq_aset_loans_one_active')) return 'Aset ini masih dalam peminjaman aktif.'
    return 'Data dengan nilai yang sama sudah ada.'
  }
  if (err?.code === '23503') return 'Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.'
  if (msg.includes('tidak berstatus Aktif')) return 'Aset tidak berstatus Aktif sehingga tidak dapat dipinjam.'
  if (msg.includes('Failed to fetch')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  if (/exceeded|too large/i.test(msg)) return 'Ukuran file terlalu besar.'
  return fallback
}
