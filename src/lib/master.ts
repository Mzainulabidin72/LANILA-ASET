// Logika Master Data yang MURNI (tanpa Supabase/React): kolom pencarian, klausa pencarian, aturan pemakaian.
import { cleanSearch } from './loans.ts'

export type MasterKey = 'categories' | 'locations' | 'employees'

/** Hanya kolom yang BENAR-BENAR ada di skema. (Tidak ada kode lokasi atau departemen.) */
export const SEARCH_COLUMNS: Record<MasterKey, string[]> = {
  categories: ['name', 'description'],
  locations: ['name', 'description'],
  employees: ['full_name', 'employee_number', 'position'],
}

/** Klausa OR PostgREST untuk pencarian; null jika kata kunci kosong. Karakter berbahaya dibuang. */
export function masterSearchClause(key: MasterKey, raw: string): string | null {
  const t = cleanSearch(raw)
  if (!t) return null
  return SEARCH_COLUMNS[key].map((c) => `${c}.ilike.%${t}%`).join(',')
}

export interface Usage { assets: number; loans: number }

export const inUse = (u: Usage | undefined | null): boolean => !!u && (u.assets > 0 || u.loans > 0)

/** "3 aset dan 2 peminjaman" / "3 aset" / "2 peminjaman" */
export function usageText(u: Usage): string {
  const parts: string[] = []
  if (u.assets > 0) parts.push(`${u.assets} aset`)
  if (u.loans > 0) parts.push(`${u.loans} peminjaman`)
  return parts.join(' dan ')
}
