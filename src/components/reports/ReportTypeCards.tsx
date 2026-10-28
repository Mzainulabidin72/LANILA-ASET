import { useRef, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Gauge, History, MapPin } from 'lucide-react'
import { REPORT_LABEL, type ReportKind } from '@/lib/reportData'

const ITEMS: { kind: ReportKind; icon: LucideIcon; desc: string }[] = [
  { kind: 'assets', icon: ClipboardList, desc: 'Seluruh aset beserta detail dan statusnya.' },
  { kind: 'by_location', icon: MapPin, desc: 'Kelompokkan aset berdasarkan lokasi penyimpanan.' },
  { kind: 'by_condition', icon: Gauge, desc: 'Analisis distribusi aset berdasarkan kondisi.' },
  { kind: 'loans', icon: History, desc: 'Tinjau transaksi peminjaman dan pengembalian berdasarkan periode.' },
]

/** Pilihan jenis laporan: radiogroup dengan navigasi panah. Satu kolom di layar sempit, dua kolom di layar lebar. */
export default function ReportTypeCards({ value, onChange }: { value: ReportKind; onChange: (k: ReportKind) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = ITEMS.length - 1
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i === 0 ? last : i - 1) : -1
    if (next < 0) return
    e.preventDefault()
    onChange(ITEMS[next].kind)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Jenis laporan" className="grid gap-3 sm:grid-cols-2">
      {ITEMS.map(({ kind, icon: Icon, desc }, i) => {
        const selected = value === kind
        return (
          <button
            key={kind}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(e) => onKey(e, i)}
            className={`card flex min-h-[72px] items-start gap-3 p-4 text-left transition motion-reduce:transition-none ${
              selected ? '!border-brand-600 bg-brand-50/60 ring-1 ring-brand-600/40 dark:bg-brand-900/20' : 'hover:border-brand-600/50 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className={`rounded-xl p-2 ${selected ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><Icon size={20} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block font-semibold">{REPORT_LABEL[kind]}</span>
              <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">{desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
