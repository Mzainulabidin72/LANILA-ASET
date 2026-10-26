import { Search, X } from 'lucide-react'
import type { MaintFilters, MaintSort } from '@/hooks/useMaintenance'
import { isValidRange } from '@/lib/loans'

interface Props {
  searchInput: string
  onSearchInput: (v: string) => void
  filters: MaintFilters
  onChange: (key: 'from' | 'to' | 'sort', value: string) => void
  active: boolean
  onClear: () => void
}

const SORTS: Record<MaintSort, string> = { auto: 'Sesuai tab', sched_asc: 'Jadwal terdekat', sched_desc: 'Jadwal terjauh', created: 'Terbaru dicatat' }

export default function MaintToolbar({ searchInput, onSearchInput, filters, onChange, active, onClear }: Props) {
  const rangeOk = isValidRange(filters.from, filters.to)
  return (
    <div className="card space-y-3 p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            className="input !pl-10"
            placeholder="Cari aset, kode, jenis perawatan, atau penanggung jawab"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            aria-label="Cari perawatan"
          />
        </div>
        <input type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange('from', e.target.value)} aria-label="Tanggal jadwal dari" title="Tanggal jadwal dari" />
        <input type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange('to', e.target.value)} aria-label="Tanggal jadwal sampai" title="Tanggal jadwal sampai" />
        <select className="input" value={filters.sort} onChange={(e) => onChange('sort', e.target.value)} aria-label="Urutkan">
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Urut: {v}</option>)}
        </select>
      </div>
      {!rangeOk && <p role="alert" className="field-error">Tanggal awal tidak boleh setelah tanggal akhir.</p>}
      {active && (
        <button onClick={onClear} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
          <X size={14} aria-hidden="true" /> Hapus semua filter
        </button>
      )}
    </div>
  )
}
