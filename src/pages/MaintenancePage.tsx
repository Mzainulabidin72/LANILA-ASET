import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Pencil, Plus, Trash2, Wrench, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  MAINT_PAGE_SIZE, useCancelMaintenance, useDeleteMaintenance, useMaintenanceList,
  type MaintTab, type MaintenanceWithRefs,
} from '@/hooks/useMaintenance'
import { daysBetween, todayISO } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatRupiah } from '@/lib/format'
import { MaintBadge, maintDisplayStatus } from '@/components/maintenance/MaintenanceBadge'
import MaintenanceFormModal from '@/components/maintenance/MaintenanceFormModal'
import CompleteModal from '@/components/maintenance/CompleteModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import SegmentedTabs from '@/components/ui/SegmentedTabs'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const TABS: { value: MaintTab; label: string }[] = [
  { value: 'upcoming', label: 'Terjadwal' },
  { value: 'overdue', label: 'Terlambat' },
  { value: 'done', label: 'Selesai' },
  { value: 'all', label: 'Semua' },
]
const EMPTY_TEXT: Record<MaintTab, string> = {
  upcoming: 'Belum ada jadwal perawatan.',
  overdue: 'Tidak ada perawatan yang terlambat.',
  done: 'Belum ada perawatan yang selesai.',
  all: 'Belum ada data perawatan.',
}

export default function MaintenancePage() {
  const toast = useToast()
  const { can } = useAuth()
  const canEdit = can('admin', 'staff')
  const isAdmin = can('admin')
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<MaintTab>('upcoming')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<MaintenanceWithRefs | null>(null)
  const [completing, setCompleting] = useState<MaintenanceWithRefs | null>(null)
  const [cancelling, setCancelling] = useState<MaintenanceWithRefs | null>(null)
  const [deleting, setDeleting] = useState<MaintenanceWithRefs | null>(null)
  const { data, isLoading, isError, refetch, isFetching } = useMaintenanceList(tab, page)
  const cancel = useCancelMaintenance()
  const del = useDeleteMaintenance()
  const today = todayISO()

  const newParam = params.get('new')
  const formOpen = canEdit && (newParam !== null || editing !== null)
  const closeForm = () => {
    setEditing(null)
    const n = new URLSearchParams(params); n.delete('new'); setParams(n, { replace: true })
  }
  const openNew = () => { const n = new URLSearchParams(params); n.set('new', '1'); setParams(n, { replace: true }) }

  const dueText = (m: MaintenanceWithRefs) => {
    if (m.status !== 'terjadwal') return null
    const d = daysBetween(today, m.scheduled_date)
    if (d < 0) return `Terlambat ${-d} hari`
    if (d === 0) return 'Hari ini'
    if (d <= 7) return `${d} hari lagi`
    return null
  }

  const doCancel = async () => {
    if (!cancelling) return
    try { await cancel.mutateAsync(cancelling.id); toast.success('Jadwal dibatalkan.') }
    catch (e) { toast.error(errorMessage(e)) }
    finally { setCancelling(null) }
  }
  const doDelete = async () => {
    if (!deleting) return
    try { await del.mutateAsync(deleting.id); toast.success('Data dihapus.') }
    catch (e) { toast.error(errorMessage(e)) }
    finally { setDeleting(null) }
  }

  const items = data?.items ?? []

  const Actions = ({ m }: { m: MaintenanceWithRefs }) => (
    <div className="flex flex-wrap gap-2">
      {m.status === 'terjadwal' && (
        <>
          <button className="btn-primary" onClick={() => setCompleting(m)}><CheckCircle2 size={18} /> Selesai</button>
          <button className="btn-secondary" onClick={() => setEditing(m)} aria-label="Ubah jadwal"><Pencil size={18} /></button>
          <button className="btn-secondary" onClick={() => setCancelling(m)} aria-label="Batalkan jadwal"><XCircle size={18} /></button>
        </>
      )}
      {isAdmin && (
        <button className="btn-secondary text-red-600 dark:text-red-400" onClick={() => setDeleting(m)} aria-label="Hapus"><Trash2 size={18} /></button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Perawatan</h1>
        {canEdit && <button className="btn-primary" onClick={openNew}><Plus size={18} /> Jadwalkan</button>}
      </div>

      <SegmentedTabs value={tab} options={TABS} onChange={(v) => { setTab(v); setPage(1) }} />

      {isError ? (
        <ErrorMessage message="Data perawatan gagal dimuat." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Wrench} title="Tidak ada data" description={EMPTY_TEXT[tab]}
          action={canEdit && tab === 'upcoming' ? <button className="btn-primary" onClick={openNew}><Plus size={18} /> Jadwalkan Perawatan</button> : undefined} />
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
          <ul className="space-y-3">
            {items.map((m) => {
              const st = maintDisplayStatus(m, today)
              const due = dueText(m)
              return (
                <li key={m.id} className="card space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{m.title}</p>
                      <Link to={`/assets/${m.asset_id}`} className="text-sm text-slate-600 hover:underline dark:text-slate-300">
                        {m.asset?.name ?? '-'} <span className="font-mono text-xs text-slate-400">({m.asset?.asset_code})</span>
                      </Link>
                    </div>
                    <MaintBadge value={st} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Jadwal {formatDate(m.scheduled_date)}
                    {m.completed_date && ` · Selesai ${formatDate(m.completed_date)}`}
                    {m.interval_days ? ` · Berkala tiap ${m.interval_days} hari` : ''}
                    {Number(m.cost) > 0 ? ` · ${formatRupiah(Number(m.cost))}` : ''}
                    {m.performed_by ? ` · ${m.performed_by}` : ''}
                  </p>
                  {due && <p className={`text-xs font-semibold ${st === 'terlambat' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>{due}</p>}
                  {m.description && <p className="text-sm text-slate-600 dark:text-slate-300">{m.description}</p>}
                  {canEdit && <Actions m={m} />}
                </li>
              )
            })}
          </ul>
          <div className="mt-4"><Pagination page={page} pageSize={MAINT_PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} /></div>
        </div>
      )}

      <MaintenanceFormModal
        open={formOpen}
        onClose={closeForm}
        editing={editing}
        presetAssetId={newParam && newParam !== '1' ? newParam : undefined}
      />
      <CompleteModal item={completing} onClose={() => setCompleting(null)} />
      <ConfirmDialog open={!!cancelling} title="Batalkan jadwal?" message="Jadwal ini akan ditandai Dibatalkan dan tidak muncul lagi sebagai pengingat."
        confirmLabel="Ya, batalkan" loading={cancel.isPending} onConfirm={doCancel} onClose={() => setCancelling(null)} />
      <ConfirmDialog open={!!deleting} danger title="Hapus data perawatan?" message="Data akan dihapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Ya, hapus" loading={del.isPending} onConfirm={doDelete} onClose={() => setDeleting(null)} />
    </div>
  )
}
