// Aturan status perawatan: fungsi MURNI (dipakai tampilan DAN dicerminkan oleh query server di hooks/useMaintenance.ts).
// Empat status saling lepas dan lengkap: setiap catatan tepat satu dari: terjadwal / terlambat / selesai / dibatalkan.
import { daysBetween } from './dates.ts'
import { cleanSearch } from './loans.ts'

export type MaintState = 'terjadwal' | 'terlambat' | 'selesai' | 'dibatalkan'
export type MaintTab = 'upcoming' | 'overdue' | 'done' | 'all'
export type MaintStatusDb = 'terjadwal' | 'selesai' | 'dibatalkan'

export const DUE_SOON_DAYS = 7

export interface MaintLike { status: MaintStatusDb; scheduled_date: string }

/** Terlambat = BELUM selesai (status terjadwal) & tanggal jadwal sudah lewat. Selesai/dibatalkan tidak pernah terlambat. */
export function maintState(m: MaintLike, today: string): MaintState {
  if (m.status === 'selesai') return 'selesai'
  if (m.status === 'dibatalkan') return 'dibatalkan'
  return m.scheduled_date < today ? 'terlambat' : 'terjadwal'
}

/** Hari menuju jadwal (negatif = sudah lewat). Hanya bermakna untuk yang belum selesai. */
export function daysUntil(m: MaintLike, today: string): number {
  return daysBetween(today, m.scheduled_date)
}

export function isDueSoon(m: MaintLike, today: string): boolean {
  if (maintState(m, today) !== 'terjadwal') return false
  const d = daysUntil(m, today)
  return d >= 0 && d <= DUE_SOON_DAYS
}

export function matchesTab(m: MaintLike, tab: MaintTab, today: string): boolean {
  const s = maintState(m, today)
  if (tab === 'all') return true
  if (tab === 'upcoming') return s === 'terjadwal'
  if (tab === 'overdue') return s === 'terlambat'
  return s === 'selesai'
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Klausa OR pencarian: judul, keterangan, penanggung jawab, ATAU aset yang cocok (nama/kode).
 * Satu klausa OR saja, jadi aman digabung dengan filter tab.
 */
export function buildMaintSearch(rawTerm: string, assetIds: string[]): string | null {
  const t = cleanSearch(rawTerm)
  if (!t) return null
  const parts = [`title.ilike.%${t}%`, `description.ilike.%${t}%`, `performed_by.ilike.%${t}%`]
  const ids = assetIds.filter((x) => UUID.test(x))
  if (ids.length) parts.push(`asset_id.in.(${ids.join(',')})`)
  return parts.join(',')
}
