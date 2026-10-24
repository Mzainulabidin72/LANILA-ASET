import { AlertTriangle, CalendarClock } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { MaintenanceDue } from '@/hooks/useDashboard'

export default function MaintenanceList({ items }: { items: MaintenanceDue[] }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((m) => (
        <li key={m.id} className="flex items-start gap-3 py-3">
          <span className={`mt-0.5 rounded-lg p-1.5 ${m.is_overdue ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
            {m.is_overdue ? <AlertTriangle size={14} /> : <CalendarClock size={14} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{m.asset_name}</p>
            <p className="truncate text-xs text-slate-600 dark:text-slate-400">{m.asset_code} · {m.title}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium">{formatDate(m.scheduled_date)}</p>
            {m.is_overdue && <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">Terlambat</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
