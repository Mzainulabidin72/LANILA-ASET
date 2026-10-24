import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface Props {
  label: string
  value: string
  icon: LucideIcon
  loading?: boolean
  tone?: 'brand' | 'amber' | 'violet'
}

const TONES = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

export default function StatCard({ label, value, icon: Icon, loading, tone = 'brand' }: Props) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-lg p-1.5 ${TONES[tone]}`}><Icon size={16} /></span>
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      {loading ? <Skeleton className="h-8 w-28" /> : <p className="truncate text-xl font-bold lg:text-2xl">{value}</p>}
    </div>
  )
}
