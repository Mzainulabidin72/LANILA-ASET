import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CalendarClock, CheckCircle2, Layers } from 'lucide-react'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import type { MaintTab } from '@/lib/maintenance'
import type { MaintCounts } from '@/hooks/useMaintenance'

interface Props {
  counts: MaintCounts | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filtered: boolean
  active: MaintTab
  onPick: (t: MaintTab) => void
}

const ITEMS: { tab: MaintTab; key: 'scheduled' | 'overdue' | 'done' | 'total'; label: string; icon: LucideIcon; tone: string }[] = [
  { tab: 'upcoming', key: 'scheduled', label: 'Terjadwal', icon: CalendarClock, tone: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' },
  { tab: 'overdue', key: 'overdue', label: 'Terlambat', icon: AlertTriangle, tone: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { tab: 'done', key: 'done', label: 'Selesai', icon: CheckCircle2, tone: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { tab: 'all', key: 'total', label: 'Total Perawatan', icon: Layers, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
]

/** Empat kartu ringkasan (angka dari database). Klik = membuka tab yang sesuai. */
export default function MaintSummaryCards({ counts, loading, error, onRetry, filtered, active, onPick }: Props) {
  if (error) return <ErrorMessage message="Ringkasan perawatan gagal dimuat." onRetry={onRetry} />
  const hint = (key: string): string => {
    if (!counts) return ''
    if (key === 'scheduled' && counts.dueSoon > 0) return `${counts.dueSoon} jatuh tempo ≤ 7 hari`
    if (key === 'total' && counts.cancelled > 0) return `termasuk ${counts.cancelled} dibatalkan`
    return ''
  }
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
              {hint(key) && <span className="block truncate text-[11px] text-slate-600 dark:text-slate-400">{hint(key)}</span>}
            </span>
          </button>
        ))}
      </div>
      {filtered && <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">Angka mengikuti pencarian dan rentang tanggal yang aktif.</p>}
    </div>
  )
}
