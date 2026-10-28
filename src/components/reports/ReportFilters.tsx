import { X } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { isValidRange } from '@/lib/loans'
import type { AssetReportFilters, LoanReportFilters } from '@/lib/reports'
import { CONDITION_LABEL, STATUS_LABEL } from '@/types/database'

export interface LookupState {
  data: { id: string; name: string }[] | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const LOAN_STATE: Record<LoanReportFilters['state'], string> = { '': 'Semua status', active: 'Sedang dipinjam', overdue: 'Terlambat', returned: 'Sudah dikembalikan' }

function LookupSelect({ id, label, allLabel, value, state, onChange }: { id: string; label: string; allLabel: string; value: string; state: LookupState; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {state.isLoading ? <Skeleton className="h-11 w-full" /> : state.isError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {label} gagal dimuat. <button type="button" onClick={state.refetch} className="font-semibold underline">Coba lagi</button>
        </p>
      ) : (
        <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{allLabel}</option>
          {(state.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}
    </div>
  )
}

interface Props {
  family: 'assets' | 'loans'
  asset: AssetReportFilters
  loan: LoanReportFilters
  categories: LookupState
  locations: LookupState
  onAsset: (key: keyof AssetReportFilters, value: string) => void
  onLoan: (key: keyof LoanReportFilters, value: string) => void
  activeCount: number
  onClear: () => void
}

/** Hanya filter yang relevan untuk jenis laporan terpilih. Filter laporan aset dan peminjaman tidak saling dipakai. */
export default function ReportFilters({ family, asset, loan, categories, locations, onAsset, onLoan, activeCount, onClear }: Props) {
  const rangeOk = isValidRange(loan.from, loan.to)
  return (
    <section className="card space-y-3 p-4" aria-label="Filter laporan">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Filter</h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <X size={14} aria-hidden="true" /> Hapus filter ({activeCount})
          </button>
        )}
      </div>

      {family === 'assets' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LookupSelect id="rf-cat" label="Kategori" allLabel="Semua kategori" value={asset.category} state={categories} onChange={(v) => onAsset('category', v)} />
          <LookupSelect id="rf-loc" label="Lokasi" allLabel="Semua lokasi" value={asset.location} state={locations} onChange={(v) => onAsset('location', v)} />
          <div>
            <label htmlFor="rf-cond" className="label">Kondisi</label>
            <select id="rf-cond" className="input" value={asset.condition} onChange={(e) => onAsset('condition', e.target.value)}>
              <option value="">Semua kondisi</option>
              {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rf-status" className="label">Status</label>
            <select id="rf-status" className="input" value={asset.status} onChange={(e) => onAsset('status', e.target.value)}>
              <option value="">Semua status aktif</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="rf-from" className="label">Tanggal pinjam dari</label>
            <input id="rf-from" type="date" className="input" value={loan.from} max={loan.to || undefined} onChange={(e) => onLoan('from', e.target.value)} />
          </div>
          <div>
            <label htmlFor="rf-to" className="label">Tanggal pinjam sampai</label>
            <input id="rf-to" type="date" className="input" value={loan.to} min={loan.from || undefined} onChange={(e) => onLoan('to', e.target.value)} />
          </div>
          <div>
            <label htmlFor="rf-state" className="label">Status peminjaman</label>
            <select id="rf-state" className="input" value={loan.state} onChange={(e) => onLoan('state', e.target.value)}>
              {Object.entries(LOAN_STATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      )}
      {family === 'loans' && !rangeOk && <p role="alert" className="field-error">Tanggal awal tidak boleh setelah tanggal akhir. Perbaiki rentang tanggal untuk melihat laporan.</p>}
      {family === 'assets' && <p className="text-xs text-slate-600 dark:text-slate-400">Laporan mencakup aset fisik/inventaris. Aset keuangan (rekening, saham, dan sejenisnya) tidak termasuk.</p>}
    </section>
  )
}
