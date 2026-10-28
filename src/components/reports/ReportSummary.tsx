import { FileSpreadsheet, FileText, Loader2, RefreshCw } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { ExportFormat } from '@/lib/reportData'

interface Props {
  title: string
  total: number
  /** jumlah kelompok (laporan per lokasi/kondisi) */
  groups?: number
  shown?: { from: number; to: number }
  chips: string[]
  period?: string
  updatedAt: number
  canExport: boolean
  busy: ExportFormat | null
  refreshing: boolean
  onExport: (f: ExportFormat) => void
  onRefresh: () => void
}

/** Ringkasan hasil + tombol unduh. Angka berasal dari data laporan yang sama dengan yang diekspor. */
export default function ReportSummary({ title, total, groups, shown, chips, period, updatedAt, canExport, busy, refreshing, onExport, onRefresh }: Props) {
  return (
    <section className="card space-y-3 p-4" aria-label="Ringkasan laporan">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
            <b className="tabular-nums">{total}</b> data cocok
            {groups !== undefined && <> dalam <b className="tabular-nums">{groups}</b> kelompok</>}
            {shown && total > 0 && <span className="text-slate-600 dark:text-slate-400"> · pratinjau menampilkan {shown.from}–{shown.to}</span>}
          </p>
          {period && <p className="text-xs text-slate-600 dark:text-slate-400">Periode tanggal pinjam: {period}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => onExport('xlsx')} disabled={!canExport || busy !== null} aria-busy={busy === 'xlsx'}>
            {busy === 'xlsx' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet size={18} aria-hidden="true" />} Unduh Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => onExport('pdf')} disabled={!canExport || busy !== null} aria-busy={busy === 'pdf'}>
            {busy === 'pdf' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />} Unduh PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        {chips.length === 0
          ? <span className="text-slate-600 dark:text-slate-400">Tanpa filter: semua data.</span>
          : chips.map((c) => <span key={c} className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">{c}</span>)}
        <span className="ml-auto flex items-center gap-2 text-slate-600 dark:text-slate-400">
          Data per {formatDateTime(new Date(updatedAt))}
          <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-brand-700 dark:text-brand-300" aria-label="Muat ulang data laporan">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" /> Muat ulang
          </button>
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">Berkas unduhan memuat seluruh {total} data yang cocok, bukan hanya halaman pratinjau. Mengunduh memerlukan koneksi internet untuk mengambil data terbaru.</p>
    </section>
  )
}
