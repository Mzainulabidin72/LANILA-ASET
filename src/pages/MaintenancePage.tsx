import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  MAINT_PAGE_SIZE, useCancelMaintenance, useDeleteMaintenance, useMaintCounts, useMaintenanceList,
  type MaintFilters, type MaintSort, type MaintenanceWithRefs,
} from '@/hooks/useMaintenance'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { todayISO } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { isValidRange } from '@/lib/loans'
import type { MaintTab } from '@/lib/maintenance'
import { QUEUED_MSG } from '@/lib/offline/messages'
import CompleteModal from '@/components/maintenance/CompleteModal'
import MaintDetailModal from '@/components/maintenance/MaintDetailModal'
import MaintEmpty from '@/components/maintenance/MaintEmpty'
import MaintList from '@/components/maintenance/MaintList'
import MaintSummaryCards from '@/components/maintenance/MaintSummaryCards'
import MaintToolbar from '@/components/maintenance/MaintToolbar'
import MaintenanceFormModal from '@/components/maintenance/MaintenanceFormModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CountTabs from '@/components/ui/CountTabs'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Pagination from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const TAB_VALUES: MaintTab[] = ['upcoming', 'overdue', 'done', 'all']
const SORT_VALUES: MaintSort[] = ['auto', 'sched_asc', 'sched_desc', 'created']
const PANEL_ID = 'maint-panel'

export default function MaintenancePage() {
  const toast = useToast()
  const { can } = useAuth()
  const canEdit = can('admin', 'staff')
  const isAdmin = can('admin')
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<MaintenanceWithRefs | null>(null)
  const [completing, setCompleting] = useState<MaintenanceWithRefs | null>(null)
  const [detail, setDetail] = useState<MaintenanceWithRefs | null>(null)
  const [cancelling, setCancelling] = useState<MaintenanceWithRefs | null>(null)
  const [deleting, setDeleting] = useState<MaintenanceWithRefs | null>(null)
  const cancel = useCancelMaintenance()
  const del = useDeleteMaintenance()
  const today = todayISO()

  // Seluruh keadaan filter disimpan di URL: bisa di-bookmark, dan tetap ada saat pindah tab.
  const tabParam = params.get('tab') as MaintTab | null
  const tab: MaintTab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : 'upcoming'
  const sortParam = params.get('sort') as MaintSort | null
  const page = Math.max(1, Number(params.get('page')) || 1)
  const raw: MaintFilters = {
    q: params.get('q') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    sort: sortParam && SORT_VALUES.includes(sortParam) ? sortParam : 'auto',
  }
  const filters: MaintFilters = isValidRange(raw.from, raw.to) ? raw : { ...raw, from: '', to: '' }

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }
  const setTab = (t: MaintTab) => update('tab', t === 'upcoming' ? '' : t)

  const [searchInput, setSearchInput] = useState(raw.q)
  const debounced = useDebouncedValue(searchInput, 350)
  useEffect(() => {
    if (debounced !== raw.q) update('q', debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const list = useMaintenanceList(tab, page, filters)
  const counts = useMaintCounts(filters)
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const filtersActive = !!(raw.q || raw.from || raw.to || raw.sort !== 'auto')
  const dataFilterActive = !!(filters.q || filters.from || filters.to)

  const clearFilters = () => {
    setSearchInput('')
    const next = new URLSearchParams()
    if (tab !== 'upcoming') next.set('tab', tab)
    setParams(next, { replace: true })
  }

  // ?new=<id|1> membuka form penjadwalan (dipakai tombol "Jadwalkan Perawatan" di detail aset)
  const newParam = params.get('new')
  const formOpen = canEdit && (newParam !== null || editing !== null)
  const openNew = () => update('new', '1', false)
  const closeForm = () => { setEditing(null); update('new', '', false) }

  const startComplete = (m: MaintenanceWithRefs) => { setDetail(null); setCompleting(m) }

  const doCancel = async () => {
    if (!cancelling) return
    try {
      const r = await cancel.mutateAsync({ id: cancelling.id, title: cancelling.title })
      toast.success(r.queued ? QUEUED_MSG : 'Jadwal dibatalkan.')
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setCancelling(null) }
  }
  const doDelete = async () => {
    if (!deleting) return
    try { await del.mutateAsync(deleting.id); toast.success('Data dihapus.') }
    catch (e) { toast.error(errorMessage(e)) }
    finally { setDeleting(null) }
  }

  const c = counts.data
  const options = [
    { value: 'upcoming' as const, label: 'Terjadwal', count: c?.scheduled },
    { value: 'overdue' as const, label: 'Terlambat', count: c?.overdue },
    { value: 'done' as const, label: 'Selesai', count: c?.done },
    { value: 'all' as const, label: 'Semua', count: c?.total },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Perawatan</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Kelola jadwal, pekerjaan, dan riwayat perawatan aset.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={openNew}><Plus size={18} aria-hidden="true" /> Jadwalkan</button>}
      </div>

      <MaintSummaryCards counts={c} loading={counts.isLoading} error={counts.isError} onRetry={() => counts.refetch()} filtered={dataFilterActive} active={tab} onPick={setTab} />

      <CountTabs value={tab} options={options} onChange={setTab} panelId={PANEL_ID} idPrefix="maint" label="Status perawatan" />

      <MaintToolbar
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        filters={raw}
        onChange={(k, v) => update(k, k === 'sort' && v === 'auto' ? '' : v)}
        active={filtersActive}
        onClear={clearFilters}
      />

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`maint-tab-${tab}`} tabIndex={0} className="outline-none">
        {list.isError ? (
          <ErrorMessage message="Data perawatan gagal dimuat. Periksa koneksi internet Anda." onRetry={() => list.refetch()} />
        ) : list.isLoading || (list.isFetching && !list.data) ? (
          <div className="space-y-3" aria-busy="true" aria-label="Memuat data perawatan">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <MaintEmpty tab={tab} filtered={dataFilterActive} canCreate={canEdit} onCreate={openNew} onClear={clearFilters} />
        ) : (
          <div className={list.isFetching ? 'opacity-70 transition-opacity motion-reduce:transition-none' : ''}>
            <MaintList
              items={items}
              startIndex={(page - 1) * MAINT_PAGE_SIZE}
              today={today}
              canEdit={canEdit}
              isAdmin={isAdmin}
              onDetail={setDetail}
              onComplete={startComplete}
              onEdit={setEditing}
              onCancel={setCancelling}
              onDelete={setDeleting}
            />
            <div className="mt-4">
              <Pagination page={page} pageSize={MAINT_PAGE_SIZE} total={total} onChange={(p) => update('page', p === 1 ? '' : String(p), false)} />
            </div>
          </div>
        )}
      </div>

      <MaintenanceFormModal open={formOpen} onClose={closeForm} editing={editing} presetAssetId={newParam && newParam !== '1' ? newParam : undefined} />
      <CompleteModal item={completing} onClose={() => setCompleting(null)} />
      <MaintDetailModal item={detail} today={today} canEdit={canEdit} onClose={() => setDetail(null)} onComplete={startComplete} />
      <ConfirmDialog open={!!cancelling} title="Batalkan jadwal?" message="Jadwal ini akan ditandai Dibatalkan dan tidak dihitung sebagai terjadwal maupun terlambat."
        confirmLabel="Ya, batalkan" loading={cancel.isPending} onConfirm={doCancel} onClose={() => setCancelling(null)} />
      <ConfirmDialog open={!!deleting} danger title="Hapus data perawatan?" message="Data akan dihapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Ya, hapus" loading={del.isPending} onConfirm={doDelete} onClose={() => setDeleting(null)} />
    </div>
  )
}
