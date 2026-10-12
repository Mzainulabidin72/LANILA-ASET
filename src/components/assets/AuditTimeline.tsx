import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import { CONDITION_LABEL, STATUS_LABEL, type AuditLog } from '@/types/database'

const FIELD_LABEL: Record<string, string> = {
  name: 'Nama',
  category_id: 'Kategori',
  brand: 'Merek',
  model: 'Model',
  serial_number: 'Nomor seri',
  acquisition_date: 'Tanggal perolehan',
  acquisition_price: 'Harga perolehan',
  location_id: 'Lokasi',
  responsible_employee_id: 'Penanggung jawab',
  condition: 'Kondisi',
  status: 'Status',
  photo_path: 'Foto',
  notes: 'Catatan',
}
const ID_FIELDS = new Set(['category_id', 'location_id', 'responsible_employee_id', 'photo_path'])

function fmt(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '-'
  if (key === 'acquisition_price') return formatRupiah(Number(v))
  if (key === 'acquisition_date') return formatDate(String(v))
  if (key === 'condition') return CONDITION_LABEL[v as keyof typeof CONDITION_LABEL] ?? String(v)
  if (key === 'status') return STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? String(v)
  return String(v)
}

function changes(log: AuditLog): string[] {
  const oldD = (log.old_data ?? {}) as Record<string, unknown>
  const newD = (log.new_data ?? {}) as Record<string, unknown>
  return Object.keys(FIELD_LABEL)
    .filter((k) => String(oldD[k] ?? '') !== String(newD[k] ?? ''))
    .map((k) =>
      ID_FIELDS.has(k) ? `${FIELD_LABEL[k]} diubah` : `${FIELD_LABEL[k]}: ${fmt(k, oldD[k])} → ${fmt(k, newD[k])}`,
    )
}

function title(log: AuditLog): string {
  const who = log.entity_type === 'aset_loans' ? 'Peminjaman' : log.entity_type === 'aset_maintenances' ? 'Perawatan' : 'Aset'
  const verb = log.action === 'INSERT' ? 'dibuat' : log.action === 'DELETE' ? 'dihapus' : 'diperbarui'
  return `${who} ${verb}`
}

export default function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
      {logs.map((log) => {
        const list = log.action === 'UPDATE' && log.entity_type === 'aset_assets' ? changes(log) : []
        return (
          <li key={log.id} className="relative">
            <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white dark:ring-slate-900" />
            <p className="text-sm font-semibold">{title(log)}</p>
            <p className="text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
            {list.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                {list.map((c) => <li key={c}>• {c}</li>)}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
