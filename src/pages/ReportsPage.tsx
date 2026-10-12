import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useLookups } from '@/hooks/useAssets'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import {
  REPORT_LABEL, exportAssetReport, exportLoanReport,
  type AssetReportFilters, type ExportFormat, type LoanReportFilters, type ReportKind,
} from '@/lib/reports'
import { CONDITION_LABEL, STATUS_LABEL } from '@/types/database'
import { useToast } from '@/components/ui/Toast'

const KINDS: { kind: ReportKind; desc: string }[] = [
  { kind: 'assets', desc: 'Seluruh aset beserta detailnya.' },
  { kind: 'by_location', desc: 'Dikelompokkan per lokasi, lengkap dengan subtotal.' },
  { kind: 'by_condition', desc: 'Dikelompokkan per kondisi (Baik, Rusak, Hilang).' },
  { kind: 'loans', desc: 'Catatan pinjam dan kembali, bisa dipilih rentang tanggal.' },
]
const LOAN_STATE_LABEL = { '': 'Semua status', active: 'Sedang dipinjam', overdue: 'Terlambat', returned: 'Sudah dikembalikan' } as const

export default function ReportsPage() {
  const toast = useToast()
  const { categories, locations } = useLookups()
  const [kind, setKind] = useState<ReportKind>('assets')
  const [af, setAf] = useState<AssetReportFilters>({ category: '', location: '', condition: '', status: '' })
  const [lf, setLf] = useState<LoanReportFilters>({ from: '', to: '', state: '' })
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  const describeFilters = (): string => {
    if (kind === 'loans') {
      const p: string[] = []
      if (lf.from) p.push(`dari ${formatDate(lf.from)}`)
      if (lf.to) p.push(`sampai ${formatDate(lf.to)}`)
      if (lf.state) p.push(LOAN_STATE_LABEL[lf.state])
      return p.join(', ')
    }
    const p: string[] = []
    if (af.category) p.push(`Kategori ${categories.find((c) => c.id === af.category)?.name ?? ''}`)
    if (af.location && kind !== 'by_location') p.push(`Lokasi ${locations.find((l) => l.id === af.location)?.name ?? ''}`)
    if (af.condition && kind !== 'by_condition') p.push(`Kondisi ${CONDITION_LABEL[af.condition as keyof typeof CONDITION_LABEL]}`)
    if (af.status) p.push(`Status ${STATUS_LABEL[af.status as keyof typeof STATUS_LABEL]}`)
    return p.join(', ')
  }

  const run = async (format: ExportFormat) => {
    if (kind === 'loans' && lf.from && lf.to && lf.from > lf.to) {
      toast.error('Tanggal awal tidak boleh setelah tanggal akhir.')
      return
    }
    setBusy(format)
    try {
      const text = describeFilters()
      const n = kind === 'loans'
        ? await exportLoanReport(format, lf, text)
        : await exportAssetReport(kind, format, af, text)
      if (n === 0) toast.error('Tidak ada data yang cocok dengan filter ini.')
      else toast.success(`Laporan berhasil dibuat (${n} baris).`)
    } catch (e) {
      toast.error(errorMessage(e, 'Laporan gagal dibuat. Coba lagi.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pilih jenis laporan, atur filter, lalu unduh sebagai Excel atau PDF.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Jenis laporan">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            role="radio"
            aria-checked={kind === k.kind}
            onClick={() => setKind(k.kind)}
            className={`card min-h-[44px] p-4 text-left transition ${kind === k.kind ? '!border-brand-600 ring-2 ring-brand-600/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
          >
            <p className="font-semibold">{REPORT_LABEL[k.kind]}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{k.desc}</p>
          </button>
        ))}
      </div>

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Filter</h2>
        {kind === 'loans' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="from" className="label">Dari tanggal</label>
              <input id="from" type="date" className="input" value={lf.from} onChange={(e) => setLf({ ...lf, from: e.target.value })} />
            </div>
            <div>
              <label htmlFor="to" className="label">Sampai tanggal</label>
              <input id="to" type="date" className="input" value={lf.to} onChange={(e) => setLf({ ...lf, to: e.target.value })} />
            </div>
            <div>
              <label htmlFor="state" className="label">Status</label>
              <select id="state" className="input" value={lf.state} onChange={(e) => setLf({ ...lf, state: e.target.value as LoanReportFilters['state'] })}>
                {Object.entries(LOAN_STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="f-cat" className="label">Kategori</label>
              <select id="f-cat" className="input" value={af.category} onChange={(e) => setAf({ ...af, category: e.target.value })}>
                <option value="">Semua kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {kind !== 'by_location' && (
              <div>
                <label htmlFor="f-loc" className="label">Lokasi</label>
                <select id="f-loc" className="input" value={af.location} onChange={(e) => setAf({ ...af, location: e.target.value })}>
                  <option value="">Semua lokasi</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            {kind !== 'by_condition' && (
              <div>
                <label htmlFor="f-cond" className="label">Kondisi</label>
                <select id="f-cond" className="input" value={af.condition} onChange={(e) => setAf({ ...af, condition: e.target.value })}>
                  <option value="">Semua kondisi</option>
                  {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="f-status" className="label">Status</label>
              <select id="f-status" className="input" value={af.status} onChange={(e) => setAf({ ...af, status: e.target.value })}>
                <option value="">Semua status aktif</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <button className="btn-primary flex-1" onClick={() => run('xlsx')} disabled={busy !== null}>
            {busy === 'xlsx' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />} Unduh Excel
          </button>
          <button className="btn-secondary flex-1" onClick={() => run('pdf')} disabled={busy !== null}>
            {busy === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Unduh PDF
          </button>
        </div>
        <p className="text-xs text-slate-500">Laporan memerlukan koneksi internet karena data diambil langsung dari server.</p>
      </section>
    </div>
  )
}
