import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDaysISO, todayISO } from '@/lib/dates'
import { uuidv4 } from '@/lib/utils'
import { useOffline } from '@/contexts/OfflineContext'
import type { MaintCancelPayload, MaintCompletePayload, MaintSavePayload } from '@/lib/offline/ops'
import type { Maintenance } from '@/types/database'

export interface MaintenanceWithRefs extends Maintenance {
  asset: { asset_code: string; name: string } | null
}

const SELECT = '*, asset:aset_assets(asset_code, name)'
export const MAINT_PAGE_SIZE = 10
export type MaintTab = 'upcoming' | 'overdue' | 'done' | 'all'

export async function fetchMaintenanceList(tab: MaintTab, page: number) {
  let q = supabase.from('aset_maintenances').select(SELECT, { count: 'exact' })
  if (tab === 'upcoming') q = q.eq('status', 'terjadwal')
  if (tab === 'overdue') q = q.eq('status', 'terjadwal').lt('scheduled_date', todayISO())
  if (tab === 'done') q = q.eq('status', 'selesai')
  const asc = tab === 'upcoming' || tab === 'overdue'
  const col = tab === 'done' ? 'completed_date' : 'scheduled_date'
  const from = (page - 1) * MAINT_PAGE_SIZE
  const { data, count, error } = await q.order(col, { ascending: asc }).order('id').range(from, from + MAINT_PAGE_SIZE - 1)
  if (error) throw error
  return { items: (data ?? []) as unknown as MaintenanceWithRefs[], total: count ?? 0 }
}

export function useMaintenanceList(tab: MaintTab, page: number) {
  return useQuery({ queryKey: ['maintenance', 'list', tab, page], queryFn: () => fetchMaintenanceList(tab, page) })
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
  const { submit } = useOffline()
  return useMutation({
    mutationFn: async ({ id, created_by, ...rest }: SaveMaintenanceInput) => {
      const payload: MaintSavePayload = { id: id ?? uuidv4(), isNew: !id, ...rest, created_by: created_by ?? null }
      return submit({ type: 'maint.save', label: `${id ? 'Ubah' : 'Jadwalkan'} perawatan: ${rest.title}`, payload })
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
  const { submit } = useOffline()
  return useMutation({
    mutationFn: async ({ item, completed_date, cost, performed_by, schedule_next, userId }: CompleteInput) => {
      const willRepeat = schedule_next && !!item.interval_days
      const payload: MaintCompletePayload = {
        id: item.id,
        asset_id: item.asset_id,
        title: item.title,
        description: item.description,
        interval_days: item.interval_days,
        completed_date,
        cost,
        performed_by,
        schedule_next,
        nextId: uuidv4(),
        nextDate: willRepeat && item.interval_days ? addDaysISO(completed_date, item.interval_days) : null,
        userId: userId ?? null,
      }
      const r = await submit({ type: 'maint.complete', label: `Selesaikan perawatan: ${item.title}`, payload })
      return { queued: r.queued, nextCreated: willRepeat }
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelMaintenance() {
  const qc = useQueryClient()
  const { submit } = useOffline()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const payload: MaintCancelPayload = { id }
      return submit({ type: 'maint.cancel', label: `Batalkan perawatan${title ? `: ${title}` : ''}`, payload })
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
