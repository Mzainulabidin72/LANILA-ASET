import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDaysISO, todayISO } from '@/lib/dates'
import type { Maintenance } from '@/types/database'

export interface MaintenanceWithRefs extends Maintenance {
  asset: { asset_code: string; name: string } | null
}

const SELECT = '*, asset:aset_assets(asset_code, name)'
export const MAINT_PAGE_SIZE = 10
export type MaintTab = 'upcoming' | 'overdue' | 'done' | 'all'

export function useMaintenanceList(tab: MaintTab, page: number) {
  return useQuery({
    queryKey: ['maintenance', 'list', tab, page],
    queryFn: async () => {
      let q = supabase.from('aset_maintenances').select(SELECT, { count: 'exact' })
      if (tab === 'upcoming') q = q.eq('status', 'terjadwal')
      if (tab === 'overdue') q = q.eq('status', 'terjadwal').lt('scheduled_date', todayISO())
      if (tab === 'done') q = q.eq('status', 'selesai')
      const asc = tab === 'upcoming' || tab === 'overdue'
      const col = tab === 'done' ? 'completed_date' : 'scheduled_date'
      const from = (page - 1) * MAINT_PAGE_SIZE
      const { data, count, error } = await q
        .order(col, { ascending: asc })
        .order('id')
        .range(from, from + MAINT_PAGE_SIZE - 1)
      if (error) throw error
      return { items: (data ?? []) as unknown as MaintenanceWithRefs[], total: count ?? 0 }
    },
  })
}

export function useAssetMaintenance(assetId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance', 'asset', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aset_maintenances')
        .select(SELECT)
        .eq('asset_id', assetId as string)
        .order('scheduled_date', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as unknown as MaintenanceWithRefs[]
    },
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['maintenance'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
  qc.invalidateQueries({ queryKey: ['assets', 'audit'] })
}

export interface SaveMaintenanceInput {
  id?: string
  asset_id: string
  title: string
  description: string | null
  scheduled_date: string
  interval_days: number | null
  cost: number
  performed_by: string | null
  created_by?: string
}

export function useSaveMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, created_by, ...values }: SaveMaintenanceInput) => {
      const { error } = id
        ? await supabase.from('aset_maintenances').update(values).eq('id', id)
        : await supabase.from('aset_maintenances').insert({ ...values, created_by: created_by ?? null })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

interface CompleteInput {
  item: MaintenanceWithRefs
  completed_date: string
  cost: number
  performed_by: string | null
  schedule_next: boolean
  userId?: string
}

/** Tandai selesai. Jika servis berkala, otomatis membuat jadwal berikutnya. */
export function useCompleteMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ item, completed_date, cost, performed_by, schedule_next, userId }: CompleteInput) => {
      const { error } = await supabase
        .from('aset_maintenances')
        .update({ status: 'selesai', completed_date, cost, performed_by })
        .eq('id', item.id)
      if (error) throw error

      let nextCreated = false
      if (schedule_next && item.interval_days) {
        const { error: e2 } = await supabase.from('aset_maintenances').insert({
          asset_id: item.asset_id,
          title: item.title,
          description: item.description,
          scheduled_date: addDaysISO(completed_date, item.interval_days),
          interval_days: item.interval_days,
          cost: 0,
          status: 'terjadwal',
          created_by: userId ?? null,
        })
        if (e2) throw e2
        nextCreated = true
      }
      return { nextCreated }
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aset_maintenances').update({ status: 'dibatalkan' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aset_maintenances').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}
