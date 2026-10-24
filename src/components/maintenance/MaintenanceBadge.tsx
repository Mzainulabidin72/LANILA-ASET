import { daysBetween } from '@/lib/dates'
import type { MaintenanceStatus } from '@/types/database'

export type MaintDisplay = 'terjadwal' | 'segera' | 'terlambat' | 'selesai' | 'dibatalkan'

/** "Segera" = jatuh tempo dalam 7 hari. "Terlambat" = jadwal sudah lewat. */
export function maintDisplayStatus(m: { status: MaintenanceStatus; scheduled_date: string }, today: string): MaintDisplay {
  if (m.status !== 'terjadwal') return m.status
  const d = daysBetween(today, m.scheduled_date)
  if (d < 0) return 'terlambat'
  if (d <= 7) return 'segera'
  return 'terjadwal'
}

const STYLE: Record<MaintDisplay, { label: string; cls: string }> = {
  terjadwal: { label: 'Terjadwal', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  segera: { label: 'Segera', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  terlambat: { label: 'Terlambat', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  selesai: { label: 'Selesai', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
}

export function MaintBadge({ value }: { value: MaintDisplay }) {
  const s = STYLE[value]
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}
