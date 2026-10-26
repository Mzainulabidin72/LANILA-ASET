import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDaysISO, todayISO } from '@/lib/dates'
import { buildMaintSearch, DUE_SOON_DAYS, type MaintTab } from '@/lib/maintenance'
import { cleanSearch } from '@/lib/loans'
import { uuidv4 } from '@/lib/utils'
import { useOffline } from '@/contexts/OfflineContext'
import type { MaintCancelPayload, MaintCompletePayload, MaintSavePayload } from '@/lib/offline/ops'
import type { Maintenance } from '@/types/database'

export interface MaintenanceWithRefs extends Maintenance {
  asset: { asset_code: string; name: string } | null
}

const SELECT = '*, asset:aset_assets(asset_code, name)'
export const MAINT_PAGE_SIZE = 15
export type { MaintTab } from '@/lib/maintenance'

export type MaintSort = 'auto' | 'sched_asc' | 'sched_desc' | 'created'
export interface MaintFilters { q: string; from: string; to: string; sort: MaintSort }
export const NO_MAINT_FILTERS: MaintFilters = { q: '', from: '', to: '', sort: 'auto' }

export interface MaintCounts { scheduled: number; overdue: number; done: number; cancelled: number; total: number; dueSoon: number }

// ---------------------------------------------------------------- query builder (cermin dari lib/maintenance.ts)

const base = () => supabase.from('aset_maintenances').select(SELECT, { count: 'exact' })
type Q = ReturnType<typeof base>
type Scope = MaintTab | 'cancelled'

function applyFilters(q: Q, scope: Scope, f: MaintFilters, assetIds: string[] | null, today: string): Q {
  let r = q
  if (scope === 'upcoming') r = r.eq('status', 'terjadwal').gte('scheduled_date', today)
  else if (scope === 'overdue') r = r.eq('status', 'terjadwal').lt('scheduled_date', today)
  else if (scope === 'done') r = r.eq('status', 'selesai')
  else if (scope === 'cancelled') r = r.eq('status', 'dibatalkan')
  if (f.from) r = r.gte('scheduled_date', f.from)
  if (f.to) r = r.lte('scheduled_date', f.to)
  const clause = buildMaintSearch(f.q, assetIds ?? [])
  if (clause) r = r.or(clause)
  return r
}

function applySort(q: Q, tab: MaintTab, sort: MaintSort): Q {
  if (sort === 'created') return q.order('created_at', { ascending: false }).order('id')
  if (sort === 'sched_asc') return q.order('scheduled_date', { ascending: true }).order('id')
  if (sort === 'sched_desc') return q.order('scheduled_date', { ascending: false }).order('id')
  // "auto": mengikuti tab (terdekat dulu untuk yang belum selesai, terbaru dulu untuk yang selesai)
  if (tab === 'done') return q.order('completed_date', { ascending: false, nullsFirst: false }).order('id')
  return q.order('scheduled_date', { ascending: tab === 'upcoming' || tab === 'overdue' }).order('id')
}

/** Cari id aset (nama/kode) yang cocok. Judul/keterangan/penanggung jawab dicari langsung di tabel perawatan. */
async function resolveAssetIds(term: string): Promise<string[]> {
  const { data, error } = await supabase.from('aset_assets').select('id').or(`name.ilike.%${term}%,asset_code.ilike.%${term}%`).limit(200)
  if (error) throw error
  return (data ?? []).map((x) => x.id as string)
}

export async function fetchMaintenanceList(tab: MaintTab, page: number, f: MaintFilters = NO_MAINT_FILTERS, assetIds: string[] | null = null) {
  const q = applySort(applyFilters(base(), tab, f, assetIds, todayISO()), tab, f.sort)
  const from = (page - 1) * MAINT_PAGE_SIZE
  const { data, count, error } = await q.range(from, from + MAINT_PAGE_SIZE - 1)
  if (error) throw error
  return { items: (data ?? []) as unknown as MaintenanceWithRefs[], total: count ?? 0 }
}

/** Hitungan (head, tanpa mengunduh baris). Total = terjadwal + terlambat + selesai + dibatalkan: status saling lepas dan lengkap. */
export async function fetchMaintCounts(f: MaintFilters, assetIds: string[] | null): Promise<MaintCounts> {
  const today = todayISO()
  const count = async (scope: Scope, extra?: (q: Q) => Q) => {
    let q = applyFilters(supabase.from('aset_maintenances').select(SELECT, { count: 'exact', head: true }), scope, f, assetIds, today)
    if (extra) q = extra(q)
    const { count: c, error } = await q
    if (error) throw error
    return c ?? 0
  }
  const [scheduled, overdue, done, cancelled, dueSoon] = await Promise.all([
    count('upcoming'),
    count('overdue'),
    count('done'),
    count('cancelled'),
    count('upcoming', (q) => q.lte('scheduled_date', addDaysISO(today, DUE_SOON_DAYS))),
  ])
  return { scheduled, overdue, done, cancelled, total: scheduled + overdue + done + cancelled, dueSoon }
}

// ---------------------------------------------------------------- hooks

function useAssetSearch(q: string) {
  const term = cleanSearch(q)
  const query = useQuery({ queryKey: ['maintenance', 'search', term], enabled: term !== '', staleTime: 60_000, queryFn: () => resolveAssetIds(term) })
  return { term, query, ready: term === '' || query.isSuccess }
}

export function useMaintenanceList(tab: MaintTab, page: number, f: MaintFilters) {
  const s = useAssetSearch(f.q)
  const filters = { ...f, q: s.term }
  const query = useQuery({
    queryKey: ['maintenance', 'list', tab, page, filters],
    enabled: s.ready,
    placeholderData: keepPreviousData,
    queryFn: () => fetchMaintenanceList(tab, page, filters, s.query.data ?? null),
  })
  return { ...query, isError: query.isError || s.query.isError, refetch: () => { void s.query.refetch(); return query.refetch() } }
}

/** Hitungan untuk kartu ringkasan dan badge tab. Mengikuti pencarian & rentang tanggal yang aktif. */
export function useMaintCounts(f: MaintFilters) {
  const s = useAssetSearch(f.q)
  const filters = { ...f, q: s.term }
  return useQuery({
    queryKey: ['maintenance', 'counts', { q: filters.q, from: filters.from, to: filters.to }],
    enabled: s.ready,
    placeholderData: keepPreviousData,
    queryFn: () => fetchMaintCounts(filters, s.query.data ?? null),
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
