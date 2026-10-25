import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/format'
import { lateDays } from '@/lib/loans'
import { CONDITION_LABEL } from '@/types/database'
import type { LoanWithRefs } from '@/hooks/useLoans'
import { LoanBadge, loanDisplayStatus } from './LoanBadge'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{children || '-'}</dd>
    </div>
  )
}

interface Props { loan: LoanWithRefs | null; today: string; canEdit: boolean; onClose: () => void; onReturn: (l: LoanWithRefs) => void }

export default function LoanDetailModal({ loan, today, canEdit, onClose, onReturn }: Props) {
  const late = loan ? lateDays(loan, today) : 0
  return (
    <Modal
      open={!!loan}
      onClose={onClose}
      title="Detail Peminjaman"
      footer={
        loan && (
          <>
            <button className="btn-secondary flex-1" onClick={onClose}>Tutup</button>
            {canEdit && !loan.return_date && (
              <button className="btn-primary flex-1" onClick={() => onReturn(loan)}><Undo2 size={18} aria-hidden="true" /> Kembalikan</button>
            )}
          </>
        )
      }
    >
      {loan && (
        <div>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/assets/${loan.asset_id}`} className="block font-semibold hover:underline" onClick={onClose}>{loan.asset?.name ?? '-'}</Link>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{loan.asset?.asset_code}</p>
            </div>
            <LoanBadge value={loanDisplayStatus(loan, today)} />
          </div>
          {late > 0 && <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Terlambat {late} hari dari jatuh tempo.</p>}
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <Row label="Peminjam">{loan.employee?.full_name}</Row>
            <Row label="Jabatan">{loan.employee?.position}</Row>
            <Row label="Telepon">{loan.employee?.phone}</Row>
            <Row label="Tanggal pinjam">{formatDate(loan.loan_date)}</Row>
            <Row label="Jatuh tempo">{loan.due_date ? formatDate(loan.due_date) : ''}</Row>
            <Row label="Tanggal kembali">{loan.return_date ? formatDate(loan.return_date) : ''}</Row>
            <Row label="Kondisi saat dipinjam">{loan.condition_out ? CONDITION_LABEL[loan.condition_out] : ''}</Row>
            <Row label="Kondisi saat kembali">{loan.condition_in ? CONDITION_LABEL[loan.condition_in] : ''}</Row>
            <Row label="Dicatat pada">{formatDateTime(loan.created_at)}</Row>
          </dl>
          {loan.notes && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Catatan</p>
              <p className="whitespace-pre-wrap">{loan.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
