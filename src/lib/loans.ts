// Aturan status peminjaman: fungsi MURNI (dipakai tampilan DAN dicerminkan oleh query server di hooks/useLoans.ts).
// Tiga status saling lepas dan lengkap: setiap peminjaman tepat satu dari: dipinjam / terlambat / dikembalikan.
import { daysBetween } from './dates.ts'

export type LoanState = 'dipinjam' | 'terlambat' | 'dikembalikan'
export type LoanTab = 'active' | 'overdue' | 'returned' | 'all'

export interface LoanLike { return_date: string | null; due_date: string | null }

/** Dikembalikan = ada tanggal kembali. Terlambat = belum kembali & jatuh tempo SUDAH lewat (kemarin atau sebelumnya). */
export function loanState(l: LoanLike, today: string): LoanState {
  if (l.return_date) return 'dikembalikan'
  if (l.due_date && l.due_date < today) return 'terlambat'
  return 'dipinjam'
}

/** Jumlah hari keterlambatan (0 jika tidak terlambat). */
export function lateDays(l: LoanLike, today: string): number {
  return loanState(l, today) === 'terlambat' && l.due_date ? daysBetween(l.due_date, today) : 0
}

/** Tab "Sedang dipinjam" TIDAK memuat yang terlambat; "Semua" memuat semuanya. */
export function matchesTab(l: LoanLike, tab: LoanTab, today: string): boolean {
  const s = loanState(l, today)
  if (tab === 'all') return true
  if (tab === 'active') return s === 'dipinjam'
  if (tab === 'overdue') return s === 'terlambat'
  return s === 'dikembalikan'
}

/** Buang karakter yang bisa merusak sintaks filter PostgREST; batasi panjang. */
export function cleanSearch(q: string): string {
  return q.replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function isValidRange(from: string, to: string): boolean {
  return !from || !to || from <= to
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Klausa OR untuk pencarian: peminjaman yang aset ATAU peminjamnya cocok. Hanya UUID valid yang dimasukkan. */
export function buildSearchClause(assetIds: string[], employeeIds: string[]): string | null {
  const parts: string[] = []
  const a = assetIds.filter((x) => UUID.test(x))
  const e = employeeIds.filter((x) => UUID.test(x))
  if (a.length) parts.push(`asset_id.in.(${a.join(',')})`)
  if (e.length) parts.push(`employee_id.in.(${e.join(',')})`)
  return parts.length ? parts.join(',') : null
}
