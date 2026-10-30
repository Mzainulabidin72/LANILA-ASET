import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { masterSearchClause, type MasterKey, type Usage } from '@/lib/master'

export type MasterTable = 'aset_categories' | 'aset_locations' | 'aset_employees'
export const MASTER_PAGE_SIZE = 20

export const TABLE_OF: Record<MasterKey, MasterTable> = {
  categories: 'aset_categories',
  locations: 'aset_locations',
  employees: 'aset_employees',
}
const KEY_OF: Record<MasterTable, MasterKey> = {
  aset_categories: 'categories',
  aset_locations: 'locations',
  aset_employees: 'employees',
}
const orderCol = (t: MasterTable) => (t === 'aset_employees' ? 'full_name' : 'name')

export type ActiveFilter = '' | 'active' | 'inactive'
export interface MasterFilters { q: string; active: ActiveFilter }
export const NO_MASTER_FILTERS: MasterFilters = { q: '', active: '' }

// ---------------------------------------------------------------- baca

export async function fetchMasterPage(table: MasterTable, page: number, f: MasterFilters) {
  let q = supabase.from(table).select('*', { count: 'exact' })
  const clause = masterSearchClause(KEY_OF[table], f.q)
  if (clause) q = q.or(clause)
  if (table === 'aset_employees' && f.active) q = q.eq('is_active', f.active === 'active')
  const from = (page - 1) * MASTER_PAGE_SIZE
  const { data, count, error } = await q.order(orderCol(table)).order('id').range(from, from + MASTER_PAGE_SIZE - 1)
  if (error) throw error
  return { items: (data ?? []) as Record<string, unknown>[], total: count ?? 0 }
}

/** Satu halaman data (pencarian & pagination dilakukan di server). */
export function useMasterPage(table: MasterTable, page: number, f: MasterFilters) {
  return useQuery({
    queryKey: ['master', 'list', table, page, f],
    placeholderData: keepPreviousData,
    queryFn: () => fetchMasterPage(table, page, f),
  })
}

export interface MasterTotals { categories: number; locations: number; employees: number }

/** Jumlah seluruh data (tanpa filter) untuk badge tab. Tidak mengunduh baris. */
export function useMasterTotals() {
  return useQuery({
    queryKey: ['master', 'totals'],
    queryFn: async (): Promise<MasterTotals> => {
      const count = async (t: MasterTable) => {
        const { count: c, error } = await supabase.from(t).select('id', { count: 'exact', head: true })
        if (error) throw error
        return c ?? 0
      }
      const [categories, locations, employees] = await Promise.all([count('aset_categories'), count('aset_locations'), count('aset_employees')])
      return { categories, locations, employees }
    },
  })
}

export type UsageMap = Record<string, Usage>

export async function fetchMasterUsage(table: MasterTable): Promise<UsageMap> {
  const { data, error } = await supabase.rpc('aset_master_usage', { p_kind: KEY_OF[table] })
  if (error) throw error
  const map: UsageMap = {}
  for (const r of (data ?? []) as { id: string; asset_count: number; loan_count: number }[]) {
    map[r.id] = { assets: Number(r.asset_count), loans: Number(r.loan_count) }
  }
  return map
}

/** Jumlah pemakaian per baris (dihitung di database, mencakup semua aset). */
export function useMasterUsage(table: MasterTable) {
  return useQuery({ queryKey: ['master', 'usage', table], queryFn: () => fetchMasterUsage(table), staleTime: 30_000 })
}

// ---------------------------------------------------------------- tulis

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['master'] }) // daftar, total, pemakaian
  qc.invalidateQueries({ queryKey: ['lookups'] })
  qc.invalidateQueries({ queryKey: ['assets'] })
}

/** Gagal dengan jelas jika tidak ada baris yang berubah (mis. ditolak aturan akses), bukan "berhasil" palsu. */
const NOT_AFFECTED = Object.assign(new Error('Tidak ada data yang berubah.'), { code: '42501' })

export function useMasterSave(table: MasterTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      if (id) {
        const { data, error } = await supabase.from(table).update(values).eq('id', id).select('id')
        if (error) throw error
        if (!data || data.length === 0) throw NOT_AFFECTED
      } else {
        const { error } = await supabase.from(table).insert(values)
        if (error) throw error
      }
    },
    onSuccess: () => invalidate(qc),
  })
}

/** Penghapusan dijaga trigger database: data yang masih dipakai ditolak (kode 23503) walau pemeriksaan layar terlewat. */
export function useMasterDelete(table: MasterTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from(table).delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw NOT_AFFECTED
    },
    onSuccess: () => invalidate(qc),
  })
}
