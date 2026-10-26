import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import { daysUntil, maintState } from '@/lib/maintenance'
import { useAssetMaintenance, type MaintenanceWithRefs } from '@/hooks/useMaintenance'
import { MaintBadge, maintDisplayStatus } from './MaintenanceBadge'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{children || '-'}</dd>
    </div>
  )
}

interface Props { item: MaintenanceWithRefs | null; today: string; canEdit: boolean; onClose: () => void; onComplete: (m: MaintenanceWithRefs) => void }

export default function MaintDetailModal({ item, today, canEdit, onClose, onComplete }: Props) {
  const history = useAssetMaintenance(item?.asset_id)
  const others = (history.data ?? []).filter((h) => h.id !== item?.id).slice(0, 5)
  const state = item ? maintState(item, today) : null
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Detail Perawatan"
      footer={
        item && (
          <>
            <button className="btn-secondary flex-1" onClick={onClose}>Tutup</button>
            {canEdit && item.status === 'terjadwal' && <button className="btn-primary flex-1" onClick={() => onComplete(item)}><CheckCircle2 size={18} aria-hidden="true" /> Selesai</button>}
          </>
        )
      }
    >
      {item && (
        <div>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{item.title}</p>
              <Link to={`/assets/${item.asset_id}`} className="text-sm hover:underline" onClick={onClose}>
                {item.asset?.name ?? '-'} <span className="font-mono text-xs text-slate-600 dark:text-slate-400">({item.asset?.asset_code})</span>
              </Link>
            </div>
            <MaintBadge value={maintDisplayStatus(item, today)} />
          </div>
          {state === 'terlambat' && <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Terlambat {-daysUntil(item, today)} hari dari jadwal.</p>}
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <Row label="Tanggal jadwal">{formatDate(item.scheduled_date)}</Row>
            <Row label="Tanggal selesai">{item.completed_date ? formatDate(item.completed_date) : ''}</Row>
            <Row label="Penanggung jawab">{item.performed_by}</Row>
            <Row label="Berkala">{item.interval_days ? `Tiap ${item.interval_days} hari` : ''}</Row>
            <Row label={item.status === 'selesai' ? 'Biaya' : 'Perkiraan biaya'}>{Number(item.cost) > 0 ? formatRupiah(Number(item.cost)) : ''}</Row>
            <Row label="Dicatat pada">{formatDateTime(item.created_at)}</Row>
          </dl>
          {item.description && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Keterangan</p>
              <p className="whitespace-pre-wrap">{item.description}</p>
            </div>
          )}
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold">Riwayat perawatan aset ini</h3>
            {history.isLoading ? <p className="text-sm text-slate-600 dark:text-slate-400">Memuat…</p>
              : history.isError ? <p className="text-sm text-slate-600 dark:text-slate-400">Riwayat gagal dimuat.</p>
              : others.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada catatan perawatan lain untuk aset ini.</p>
              : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {others.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{h.title}<span className="block text-xs text-slate-600 dark:text-slate-400">{formatDate(h.completed_date ?? h.scheduled_date)}</span></span>
                      <MaintBadge value={maintDisplayStatus(h, today)} />
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      )}
    </Modal>
  )
}
