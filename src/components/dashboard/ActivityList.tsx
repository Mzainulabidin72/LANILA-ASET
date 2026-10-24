import { Plus, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { AuditLog } from '@/types/database'

const ENTITY: Record<string, string> = { aset_assets: 'Aset', aset_loans: 'Peminjaman', aset_maintenances: 'Perawatan' }
const ACTION: Record<AuditLog['action'], { label: string; icon: LucideIcon; cls: string }> = {
  INSERT: { label: 'ditambahkan', icon: Plus, cls: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  UPDATE: { label: 'diperbarui', icon: Pencil, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  DELETE: { label: 'dihapus', icon: Trash2, cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

function describe(log: AuditLog): string {
  const row = (log.new_data ?? log.old_data ?? {}) as Record<string, unknown>
  const name = (row.name ?? row.title ?? row.asset_code ?? '') as string
  return name ? `"${name}"` : ''
}

export default function ActivityList({ logs }: { logs: AuditLog[] }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {logs.map((log) => {
        const a = ACTION[log.action]
        const Icon = a.icon
        return (
          <li key={log.id} className="flex items-start gap-3 py-3">
            <span className={`mt-0.5 rounded-lg p-1.5 ${a.cls}`}><Icon size={14} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <b>{ENTITY[log.entity_type] ?? log.entity_type}</b> {describe(log)} {a.label}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{formatDateTime(log.created_at)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
