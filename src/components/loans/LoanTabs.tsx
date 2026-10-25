import { useRef, type KeyboardEvent } from 'react'
import type { LoanTab } from '@/lib/loans'
import type { LoanCounts } from '@/hooks/useLoans'

const TABS: { value: LoanTab; label: string; key: keyof LoanCounts }[] = [
  { value: 'active', label: 'Sedang Dipinjam', key: 'onLoan' },
  { value: 'overdue', label: 'Terlambat', key: 'overdue' },
  { value: 'returned', label: 'Dikembalikan', key: 'returned' },
  { value: 'all', label: 'Semua', key: 'total' },
]

interface Props { value: LoanTab; counts: LoanCounts | undefined; onChange: (t: LoanTab) => void; panelId: string }

/** Tab dengan badge jumlah. Navigasi keyboard: panah kiri/kanan, Home, End (pola WAI-ARIA tabs). */
export default function LoanTabs({ value, counts, onChange, panelId }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = TABS.length - 1
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (next < 0) return
    e.preventDefault()
    onChange(TABS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Status peminjaman" className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-200/70 p-1 dark:bg-slate-800">
      {TABS.map((t, i) => {
        const selected = value === t.value
        return (
          <button
            key={t.value}
            ref={(el) => { refs.current[i] = el }}
            role="tab"
            id={`loan-tab-${t.value}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition motion-reduce:transition-none ${
              selected ? 'bg-white text-brand-800 shadow dark:bg-slate-900 dark:text-brand-200' : 'text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700/50'
            }`}
          >
            {t.label}
            {counts && (
              <span className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums ${selected ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200' : 'bg-slate-300/70 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
