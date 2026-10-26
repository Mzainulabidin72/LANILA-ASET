import { CheckCircle2, Eye, Pencil, Trash2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { daysUntil, maintState } from '@/lib/maintenance'
import { formatDate } from '@/lib/format'
import type { MaintenanceWithRefs } from '@/hooks/useMaintenance'
import { MaintBadge, maintDisplayStatus } from './MaintenanceBadge'

interface Props {
  items: MaintenanceWithRefs[]
  startIndex: number
  today: string
  canEdit: boolean
  isAdmin: boolean
  onDetail: (m: MaintenanceWithRefs) => void
  onComplete: (m: MaintenanceWithRefs) => void
  onEdit: (m: MaintenanceWithRefs) => void
  onCancel: (m: MaintenanceWithRefs) => void
  onDelete: (m: MaintenanceWithRefs) => void
}

/** Keterangan jadwal: terlambat diberi penekanan, tanpa mewarnai seluruh baris. */
function DueNote({ m, today }: { m: MaintenanceWithRefs; today: string }) {
  const s = maintState(m, today)
  if (s !== 'terjadwal' && s !== 'terlambat') return null
  const d = daysUntil(m, today)
  if (s === 'terlambat') return <span className="block text-xs font-semibold text-red-700 dark:text-red-400">Terlambat {-d} hari</span>
  if (d === 0) return <span className="block text-xs font-semibold text-amber-800 dark:text-amber-300">Hari ini</span>
  if (d <= 7) return <span className="block text-xs text-amber-800 dark:text-amber-300">{d} hari lagi</span>
  return null
}

/** Aksi hanya yang valid untuk status catatan: Selesai/Ubah/Batalkan hanya untuk yang masih terjadwal; Hapus hanya Admin. */
function Actions({ m, canEdit, isAdmin, ...h }: Pick<Props, 'canEdit' | 'isAdmin' | 'onDetail' | 'onComplete' | 'onEdit' | 'onCancel' | 'onDelete'> & { m: MaintenanceWithRefs }) {
  const open = m.status === 'terjadwal'
  const name = m.title
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button className="btn-ghost !min-h-[40px] !px-3" onClick={() => h.onDetail(m)} aria-label={`Lihat detail ${name}`}><Eye size={18} aria-hidden="true" /> Detail</button>
      {canEdit && open && (
        <>
          <button className="btn-primary !min-h-[40px] !px-3" onClick={() => h.onComplete(m)} aria-label={`Tandai selesai ${name}`}><CheckCircle2 size={18} aria-hidden="true" /> Selesai</button>
          <button className="btn-secondary !min-h-[40px] !px-3" onClick={() => h.onEdit(m)} aria-label={`Ubah jadwal ${name}`} title="Ubah jadwal"><Pencil size={18} aria-hidden="true" /></button>
          <button className="btn-secondary !min-h-[40px] !px-3" onClick={() => h.onCancel(m)} aria-label={`Batalkan jadwal ${name}`} title="Batalkan jadwal"><XCircle size={18} aria-hidden="true" /></button>
        </>
      )}
      {isAdmin && (
        <button className="btn-secondary !min-h-[40px] !px-3 text-red-700 dark:text-red-400" onClick={() => h.onDelete(m)} aria-label={`Hapus ${name}`} title="Hapus"><Trash2 size={18} aria-hidden="true" /></button>
      )}
    </div>
  )
}

export default function MaintList({ items, startIndex, today, canEdit, isAdmin, ...h }: Props) {
  const actionProps = { canEdit, isAdmin, ...h }
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {items.map((m) => (
          <li key={m.id} className="card space-y-2 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{m.title}</p>
                <Link to={`/assets/${m.asset_id}`} className="text-sm text-slate-700 hover:underline dark:text-slate-300">
                  {m.asset?.name ?? '-'} <span className="font-mono text-xs text-slate-600 dark:text-slate-400">({m.asset?.asset_code ?? '-'})</span>
                </Link>
              </div>
              <MaintBadge value={maintDisplayStatus(m, today)} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Jadwal {formatDate(m.scheduled_date)}
              {m.completed_date && ` · Selesai ${formatDate(m.completed_date)}`}
              {m.performed_by ? ` · ${m.performed_by}` : ''}
              {m.interval_days ? ` · Berkala tiap ${m.interval_days} hari` : ''}
            </p>
            <DueNote m={m} today={today} />
            <Actions m={m} {...actionProps} />
          </li>
        ))}
      </ul>

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <tr>
              <th scope="col" className="w-12 p-3 font-semibold">No.</th>
              <th scope="col" className="p-3 font-semibold">Nama Aset</th>
              <th scope="col" className="p-3 font-semibold">Kode Aset</th>
              <th scope="col" className="p-3 font-semibold">Jenis Perawatan</th>
              <th scope="col" className="p-3 font-semibold">Tanggal Jadwal</th>
              <th scope="col" className="p-3 font-semibold">Penanggung Jawab</th>
              <th scope="col" className="p-3 font-semibold">Status</th>
              <th scope="col" className="p-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((m, i) => (
              <tr key={m.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-3 tabular-nums text-slate-600 dark:text-slate-400">{startIndex + i + 1}</td>
                <td className="max-w-[14rem] p-3"><Link to={`/assets/${m.asset_id}`} className="block truncate font-semibold hover:underline">{m.asset?.name ?? '-'}</Link></td>
                <td className="p-3 font-mono text-xs">{m.asset?.asset_code ?? '-'}</td>
                <td className="max-w-[16rem] p-3">
                  <span className="block font-medium">{m.title}</span>
                  {m.interval_days ? <span className="block text-xs text-slate-600 dark:text-slate-400">Berkala tiap {m.interval_days} hari</span> : null}
                </td>
                <td className="whitespace-nowrap p-3 tabular-nums">
                  {formatDate(m.scheduled_date)}
                  {m.completed_date && <span className="block text-xs text-slate-600 dark:text-slate-400">Selesai {formatDate(m.completed_date)}</span>}
                  <DueNote m={m} today={today} />
                </td>
                <td className="p-3">{m.performed_by || <span className="text-slate-600 dark:text-slate-400">-</span>}</td>
                <td className="p-3"><MaintBadge value={maintDisplayStatus(m, today)} /></td>
                <td className="p-3"><Actions m={m} {...actionProps} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
