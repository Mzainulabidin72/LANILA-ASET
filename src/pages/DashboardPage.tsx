import { Link } from 'react-router-dom'
import { Boxes, HandCoins, PackageOpen, RefreshCw, Wallet, Wrench, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatRupiah } from '@/lib/format'
import { useDashboardSummary, useMaintenanceDue, useRecentActivity } from '@/hooks/useDashboard'
import StatCard from '@/components/dashboard/StatCard'
import ChartCard from '@/components/dashboard/ChartCard'
import { ConditionDonut, HorizontalBars } from '@/components/dashboard/Charts'
import ActivityList from '@/components/dashboard/ActivityList'
import MaintenanceList from '@/components/dashboard/MaintenanceList'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  const { profile, can } = useAuth()
  const canSeeActivity = can('admin', 'staff')
  const summary = useDashboardSummary()
  const due = useMaintenanceDue()
  const activity = useRecentActivity(canSeeActivity)

  const s = summary.data
  const refreshAll = () => { summary.refetch(); due.refetch(); if (canSeeActivity) activity.refetch() }
  const refreshing = summary.isFetching || due.isFetching || activity.isFetching

  if (summary.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Beranda</h1>
        <ErrorMessage message="Data dashboard gagal dimuat. Periksa koneksi internet lalu coba lagi." onRetry={refreshAll} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Halo, {profile?.full_name?.split(' ')[0] || 'Pengguna'} 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ringkasan aset Anda hari ini.</p>
        </div>
        <button onClick={refreshAll} className="btn-secondary !px-3" aria-label="Muat ulang data">
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Aset" value={String(s?.totalAssets ?? 0)} icon={Boxes} loading={summary.isLoading} />
        <StatCard label="Nilai Total Aset" value={formatRupiah(s?.totalValue)} icon={Wallet} loading={summary.isLoading} />
        <StatCard label="Sedang Dipinjam" value={String(s?.loanedCount ?? 0)} icon={HandCoins} loading={summary.isLoading} tone="violet" />
        <StatCard label="Butuh Perawatan" value={String(due.data?.total ?? 0)} icon={Wrench} loading={due.isLoading} tone="amber" />
      </div>

      {!summary.isLoading && s?.totalAssets === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Belum ada aset"
          description="Tambahkan aset pertama Anda untuk mulai melihat grafik dan ringkasan di sini."
          action={can('admin', 'staff') ? <Link to="/assets" className="btn-primary">Kelola Aset</Link> : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Aset per Kategori" loading={summary.isLoading} empty={!s?.byCategory.length}>
            <HorizontalBars data={s?.byCategory ?? []} />
          </ChartCard>
          <ChartCard title="Aset per Kondisi" loading={summary.isLoading} empty={!s?.byCondition.length}>
            <ConditionDonut data={s?.byCondition ?? []} />
          </ChartCard>
          <ChartCard title="Aset per Lokasi" loading={summary.isLoading} empty={!s?.byLocation.length}>
            <HorizontalBars data={s?.byLocation ?? []} />
          </ChartCard>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-1 text-sm font-semibold">Perlu Perawatan</h2>
          {due.isLoading ? (
            <div className="space-y-3 py-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : due.isError ? (
            <p className="py-6 text-center text-sm text-slate-400">Gagal memuat jadwal perawatan.</p>
          ) : due.data && due.data.items.length > 0 ? (
            <MaintenanceList items={due.data.items} />
          ) : (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <CheckCircle2 size={18} className="text-green-500" /> Tidak ada perawatan yang jatuh tempo.
            </p>
          )}
        </section>

        {canSeeActivity && (
          <section className="card p-4">
            <h2 className="mb-1 text-sm font-semibold">Aktivitas Terbaru</h2>
            {activity.isLoading ? (
              <div className="space-y-3 py-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : activity.isError ? (
              <p className="py-6 text-center text-sm text-slate-400">Gagal memuat aktivitas.</p>
            ) : activity.data && activity.data.length > 0 ? (
              <ActivityList logs={activity.data} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
