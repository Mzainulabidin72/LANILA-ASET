import { useAssetLoans } from '@/hooks/useLoans'
import { useAssetMaintenance } from '@/hooks/useMaintenance'
import { todayISO } from '@/lib/dates'
import { formatDate, formatRupiah } from '@/lib/format'
import { LoanBadge, loanDisplayStatus } from '@/components/loans/LoanBadge'
import { MaintBadge, maintDisplayStatus } from '@/components/maintenance/MaintenanceBadge'
import { Skeleton } from '@/components/ui/Skeleton'

export function AssetLoanHistory({ assetId }: { assetId: string }) {
  const { data, isLoading, isError } = useAssetLoans(assetId)
  const today = todayISO()
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold">Riwayat Peminjaman</h2>
      {isLoading ? <Skeleton className="h-20 w-full" />
        : isError ? <p className="text-sm text-slate-400">Riwayat gagal dimuat.</p>
        : !data || data.length === 0 ? <p className="text-sm text-slate-400">Aset ini belum pernah dipinjam.</p>
        : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.employee?.full_name ?? '-'}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(l.loan_date)} → {l.return_date ? formatDate(l.return_date) : 'belum kembali'}
                    {l.due_date && !l.return_date ? ` (jatuh tempo ${formatDate(l.due_date)})` : ''}
                  </p>
                </div>
                <LoanBadge value={loanDisplayStatus(l, today)} />
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}

export function AssetMaintenanceHistory({ assetId }: { assetId: string }) {
  const { data, isLoading, isError } = useAssetMaintenance(assetId)
  const today = todayISO()
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold">Jadwal & Riwayat Perawatan</h2>
      {isLoading ? <Skeleton className="h-20 w-full" />
        : isError ? <p className="text-sm text-slate-400">Data gagal dimuat.</p>
        : !data || data.length === 0 ? <p className="text-sm text-slate-400">Belum ada jadwal perawatan.</p>
        : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    Jadwal {formatDate(m.scheduled_date)}
                    {m.completed_date ? ` · selesai ${formatDate(m.completed_date)}` : ''}
                    {Number(m.cost) > 0 ? ` · ${formatRupiah(Number(m.cost))}` : ''}
                  </p>
                </div>
                <MaintBadge value={maintDisplayStatus(m, today)} />
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}
