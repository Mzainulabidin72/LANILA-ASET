import { Eye, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { lateDays } from '@/lib/loans'
import type { LoanWithRefs } from '@/hooks/useLoans'
import { LoanBadge, loanDisplayStatus } from './LoanBadge'

interface Props {
  items: LoanWithRefs[]
  startIndex: number
  today: string
  canEdit: boolean
  onDetail: (l: LoanWithRefs) => void
  onReturn: (l: LoanWithRefs) => void
}

function Late({ l, today }: { l: LoanWithRefs; today: string }) {
  const d = lateDays(l, today)
  return d > 0 ? <span className="block text-xs font-semibold text-red-700 dark:text-red-400">Terlambat {d} hari</span> : null
}

/** Tabel (>= md) dan kartu (HP). Aksi Kembalikan hanya untuk peminjaman yang belum dikembalikan dan hanya Admin/Staf. */
export default function LoanList({ items, startIndex, today, canEdit, onDetail, onReturn }: Props) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {items.map((l) => (
          <li key={l.id} className="card space-y-2 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/assets/${l.asset_id}`} className="block truncate font-semibold hover:underline">{l.asset?.name ?? '-'}</Link>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{l.asset?.asset_code ?? '-'}</p>
              </div>
              <LoanBadge value={loanDisplayStatus(l, today)} />
            </div>
            <p className="text-sm">{l.employee?.full_name ?? '-'}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pinjam {formatDate(l.loan_date)} · Jatuh tempo {formatDate(l.due_date)}
              {l.return_date && ` · Kembali ${formatDate(l.return_date)}`}
            </p>
            <Late l={l} today={today} />
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary flex-1" onClick={() => onDetail(l)} aria-label={`Lihat detail peminjaman ${l.asset?.name ?? ''}`}><Eye size={18} aria-hidden="true" /> Detail</button>
              {canEdit && !l.return_date && (
                <button className="btn-primary flex-1" onClick={() => onReturn(l)} aria-label={`Kembalikan ${l.asset?.name ?? 'aset'}`}><Undo2 size={18} aria-hidden="true" /> Kembalikan</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <tr>
              <th scope="col" className="w-12 p-3 font-semibold">No.</th>
              <th scope="col" className="p-3 font-semibold">Nama Aset</th>
              <th scope="col" className="p-3 font-semibold">Kode Aset</th>
              <th scope="col" className="p-3 font-semibold">Peminjam</th>
              <th scope="col" className="p-3 font-semibold">Tgl Pinjam</th>
              <th scope="col" className="p-3 font-semibold">Jatuh Tempo</th>
              <th scope="col" className="p-3 font-semibold">Tgl Kembali</th>
              <th scope="col" className="p-3 font-semibold">Status</th>
              <th scope="col" className="p-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((l, i) => (
              <tr key={l.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-3 tabular-nums text-slate-600 dark:text-slate-400">{startIndex + i + 1}</td>
                <td className="max-w-[16rem] p-3"><Link to={`/assets/${l.asset_id}`} className="block truncate font-semibold hover:underline">{l.asset?.name ?? '-'}</Link></td>
                <td className="p-3 font-mono text-xs">{l.asset?.asset_code ?? '-'}</td>
                <td className="p-3">{l.employee?.full_name ?? '-'}</td>
                <td className="whitespace-nowrap p-3 tabular-nums">{formatDate(l.loan_date)}</td>
                <td className="whitespace-nowrap p-3 tabular-nums">{formatDate(l.due_date)}<Late l={l} today={today} /></td>
                <td className="whitespace-nowrap p-3 tabular-nums">{formatDate(l.return_date)}</td>
                <td className="p-3"><LoanBadge value={loanDisplayStatus(l, today)} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost !min-h-[40px] !px-3" onClick={() => onDetail(l)} aria-label={`Lihat detail peminjaman ${l.asset?.name ?? ''}`}><Eye size={18} aria-hidden="true" /> Detail</button>
                    {canEdit && !l.return_date && (
                      <button className="btn-secondary !min-h-[40px] !px-3" onClick={() => onReturn(l)} aria-label={`Kembalikan ${l.asset?.name ?? 'aset'}`}><Undo2 size={18} aria-hidden="true" /> Kembalikan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
