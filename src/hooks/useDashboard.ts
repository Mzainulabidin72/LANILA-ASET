import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CONDITION_LABEL, type AssetCondition, type AuditLog } from '@/types/database'

export interface ChartDatum { name: string; value: number; key?: string }

export interface DashboardSummary {
  totalAssets: number
  totalValue: number
  loanedCount: number
  byCategory: ChartDatum[]
  byCondition: ChartDatum[]
  byLocation: ChartDatum[]
}

export interface MaintenanceDue {
  id: string
  asset_id: string
  asset_code: string
  asset_name: string
  title: string
  scheduled_date: string
  is_overdue: boolean
}

interface AssetRow {
  category_id: string | null
  location_id: string | null
  condition: AssetCondition
  status: string
  acquisition_price: number | string | null
}

/** Supabase membatasi 1000 baris per request, jadi diambil bertahap. */
async function fetchAllAssets(): Promise<AssetRow[]> {
  const pageSize = 1000
  const rows: AssetRow[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('aset_assets')
      .select('category_id, location_id, condition, status, acquisition_price')
      .neq('status', 'dihapus')
      .order('id')
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data as AssetRow[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

function countBy(rows: AssetRow[], pick: (r: AssetRow) => string, labelOf: (k: string) => string): ChartDatum[] {
  const map = new Map<string, number>()
  rows.forEach((r) => map.set(pick(r), (map.get(pick(r)) ?? 0) + 1))
  return [...map.entries()]
    .map(([key, value]) => ({ key, name: labelOf(key), value }))
    .sort((a, b) => b.value - a.value)
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async (): Promise<DashboardSummary> => {
      const [assets, cats, locs] = await Promise.all([
        fetchAllAssets(),
        supabase.from('aset_categories').select('id, name'),
        supabase.from('aset_locations').select('id, name'),
      ])
      if (cats.error) throw cats.error
      if (locs.error) throw locs.error
      const catName = new Map((cats.data ?? []).map((c) => [c.id as string, c.name as string]))
      const locName = new Map((locs.data ?? []).map((l) => [l.id as string, l.name as string]))

      return {
        totalAssets: assets.length,
        totalValue: assets.reduce((sum, a) => sum + Number(a.acquisition_price ?? 0), 0),
        loanedCount: assets.filter((a) => a.status === 'dipinjam').length,
        byCategory: countBy(assets, (a) => a.category_id ?? '-', (k) => catName.get(k) ?? 'Tanpa kategori'),
        byCondition: countBy(assets, (a) => a.condition, (k) => CONDITION_LABEL[k as AssetCondition] ?? k),
        byLocation: countBy(assets, (a) => a.location_id ?? '-', (k) => locName.get(k) ?? 'Tanpa lokasi'),
      }
    },
  })
}

export function useMaintenanceDue() {
  return useQuery({
    queryKey: ['dashboard', 'maintenance-due'],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('aset_v_maintenance_due')
        .select('*', { count: 'exact' })
        .order('scheduled_date', { ascending: true })
        .limit(5)
      if (error) throw error
      return { items: (data ?? []) as MaintenanceDue[], total: count ?? 0 }
    },
  })
}

/** Audit log hanya boleh dibaca Admin & Staf (lihat RLS), jadi Viewer tidak memanggilnya. */
export function useRecentActivity(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aset_audit_logs')
        .select('id, asset_id, entity_type, entity_id, action, old_data, new_data, created_at')
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as AuditLog[]
    },
  })
}
