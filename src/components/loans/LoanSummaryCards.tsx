import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, HandCoins, Layers } from 'lucide-react'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import type { LoanTab } from '@/lib/loans'
import type { LoanCounts } from '@/hooks/useLoans'

interface Props {
  counts: LoanCounts | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filtered: boolean
  active: LoanTab
  onPick: (t: LoanTab) => void
}

const ITEMS: { tab: LoanTab; key: keyof LoanCounts; label: string; icon: LucideIcon; tone: string }[] = [
  { tab: 'active', key: 'onLoan', label: 'Sedang Dipinjam', icon: HandCoins, tone: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' },
  { tab: 'overdue', key: 'overdue', label: 'Terlambat', icon: AlertTriangle, tone: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { tab: 'returned', key: 'returned', label: 'Dikembalikan', icon: CheckCircle2, tone: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { tab: 'all', key: 'total', label: 'Total Peminjaman', icon: Layers, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
]

/** Empat kartu ringkasan. Klik = membuka tab yang sesuai. Angka berasal dari database, bukan contoh. */
export default function LoanSummaryCards({ counts, loading, error, onRetry, filtered, active, onPick }: Props) {
  if (error) return <ErrorMessage message="Ringkasan peminjaman gagal dimuat." onRetry={onRetry} />
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ITEMS.map(({ tab, key, label, icon: Icon, tone }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onPick(tab)}
            aria-label={`${label}: ${counts ? counts[key] : 'memuat'}. Tampilkan daftar.`}
            aria-pressed={active === tab}
            className={`card flex min-h-[44px] items-center gap-3 p-3.5 text-left transition hover:border-brand-600/60 motion-reduce:transition-none ${active === tab ? '!border-brand-600 ring-1 ring-brand-600/40' : ''}`}
          >
            <span className={`rounded-xl p-2 ${tone}`}><Icon size={18} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block truncate text-xs text-slate-600 dark:text-slate-400">{label}</span>
              {loading && !counts ? <Skeleton className="mt-1 h-6 w-10" /> : <span className="block text-xl font-bold tabular-nums">{counts ? counts[key] : '-'}</span>}
            </span>
          </button>
        ))}
      </div>
      {filtered && <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">Angka mengikuti pencarian dan rentang tanggal yang aktif.</p>}
    </div>
  )
}
