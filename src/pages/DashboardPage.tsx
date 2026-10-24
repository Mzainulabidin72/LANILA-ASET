import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, HandCoins, Landmark, PackageOpen, Plus, RefreshCw, TrendingUp, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMaintenanceDue, useRecentActivity, type ChartDatum } from '@/hooks/useDashboard'
import { usePortfolio } from '@/hooks/useWealth'
import { computeValuation, isArchived, summarize } from '@/lib/wealth/calc'
import { CONDITION_LABEL } from '@/types/database'
import { isPhysical } from '@/types/wealth'
import AllocationChart from '@/components/wealth/AllocationChart'
import SummaryCards from '@/components/wealth/SummaryCards'
import { GainCell } from '@/components/wealth/ValueParts'
import ActivityList from '@/components/dashboard/ActivityList'
import MaintenanceList from '@/components/dashboard/MaintenanceList'
import ChartCard from '@/components/dashboard/ChartCard'
import { ConditionDonut, HorizontalBars } from '@/components/dashboard/Charts'
import Money, { PrivacyToggle } from '@/components/ui/Money'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'

function countBy<T>(list: T[], key: (x: T) => string, label: (k: string) => string): ChartDatum[] {
  const m = new Map<string, number>()
  list.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1))
  return [...m.entries()].map(([k, value]) => ({ key: k, name: label(k), value })).sort((a, b) => b.value - a.value)
}

export default function DashboardPage() {
  const { profile, can } = useAuth()
  const canSeeActivity = can('admin', 'staff')
  const portfolio = usePortfolio()
  const due = useMaintenanceDue()
  const activity = useRecentActivity(canSeeActivity)

  const rows = useMemo(() => (portfolio.data ?? []).filter((a) => !isArchived(a.status)).map((a) => ({ a, v: computeValuation(a) })), [portfolio.data])
  const summary = useMemo(() => summarize(portfolio.data ?? []), [portfolio.data])

  const cash = rows.filter((r) => r.a.asset_class === 'cash')
  const cashTotal = cash.reduce((s, r) => s + (r.v.valueIdr ?? 0), 0)
  const performers = rows.filter((r) => r.v.gainEligible && r.v.gainPct !== null).sort((x, y) => (y.v.gainPct ?? 0) - (x.v.gainPct ?? 0)).slice(0, 5)

  const physical = rows.filter((r) => isPhysical(r.a.asset_class))
  const loaned = physical.filter((r) => r.a.status === 'dipinjam').length
  const byCategory = countBy(physical, (r) => r.a.category?.name ?? '-', (k) => (k === '-' ? 'Tanpa kategori' : k))
  const byCondition = countBy(physical, (r) => r.a.condition, (k) => CONDITION_LABEL[k as keyof typeof CONDITION_LABEL] ?? k)
  const byLocation = countBy(physical, (r) => r.a.location?.name ?? '-', (k) => (k === '-' ? 'Tanpa lokasi' : k))

  const refresh = () => { portfolio.refetch(); due.refetch(); if (canSeeActivity) activity.refetch() }
  const refreshing = portfolio.isFetching || due.isFetching || activity.isFetching

  if (portfolio.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Beranda</h1>
        <ErrorMessage message="Data dashboard gagal dimuat. Periksa koneksi internet lalu coba lagi." onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Halo, {profile?.full_name?.split(' ')[0] || 'Pengguna'} 👋</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ringkasan aset dan portofolio Anda.</p>
        </div>
        <div className="flex gap-2">
          <PrivacyToggle />
          <button onClick={refresh} className="btn-secondary !px-3" aria-label="Muat ulang data"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <SummaryCards summary={summary} loading={portfolio.isLoading} />
      <p className="-mt-3 text-xs text-slate-600 dark:text-slate-400">Angka di atas adalah total aset, bukan kekayaan bersih: utang dan kewajiban belum dicatat di aplikasi ini.</p>

      {!portfolio.isLoading && summary.count === 0 ? (
        <EmptyState icon={PackageOpen} title="Belum ada aset" description="Catat rekening, saham, emas, properti, atau barang berharga pertama Anda untuk mulai melihat portofolio."
          action={<Link to="/assets/new" className="btn-primary"><Plus size={18} /> Tambah Aset</Link>} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="card p-4 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold">Alokasi Aset</h2>
              {portfolio.isLoading ? <Skeleton className="h-56 w-full" />
                : summary.byClass.length > 0 ? <AllocationChart data={summary.byClass} />
                : <p className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">Belum ada aset yang bernilai untuk ditampilkan.</p>}
            </section>

            <section className="card p-4">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Landmark size={16} aria-hidden="true" /> Kas &amp; Rekening Bank</h2>
              {cash.length === 0 ? (
                <p className="py-6 text-sm text-slate-600 dark:text-slate-400">Belum ada rekening tercatat.</p>
              ) : (
                <>
                  <p className="mb-2 text-2xl font-bold"><Money value={cashTotal} /></p>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cash.slice(0, 5).map((r) => (
                      <li key={r.a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <Link to={`/assets/${r.a.id}`} className="min-w-0 truncate hover:underline">{r.a.name}<span className="block truncate text-xs text-slate-600 dark:text-slate-400">{r.a.institution}</span></Link>
                        <Money value={r.v.value} currency={r.v.currency} className="font-semibold" />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>

          <section className="card p-4">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><TrendingUp size={16} aria-hidden="true" /> Performa Investasi</h2>
            {performers.length === 0 ? (
              <p className="py-6 text-sm text-slate-600 dark:text-slate-400">Isi harga terkini saham, reksa dana, kripto, atau emas (lewat Perbarui Nilai) untuk melihat untung/rugi. Aplikasi tidak mengambil harga pasar otomatis.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {performers.map((r) => (
                  <li key={r.a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link to={`/assets/${r.a.id}`} className="min-w-0 truncate font-medium hover:underline">{r.a.name}{r.a.symbol ? <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">{r.a.symbol}</span> : null}</Link>
                    <GainCell v={r.v} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {physical.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><HandCoins size={16} aria-hidden="true" /> Sedang Dipinjam</div>
                  <p className="text-2xl font-bold">{loaned}</p>
                </div>
                <div className="card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Wrench size={16} aria-hidden="true" /> Butuh Perawatan</div>
                  <p className="text-2xl font-bold">{due.isLoading ? '…' : (due.data?.total ?? 0)}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <ChartCard title="Inventaris per Kategori" empty={byCategory.length === 0}><HorizontalBars data={byCategory} /></ChartCard>
                <ChartCard title="Inventaris per Kondisi" empty={byCondition.length === 0}><ConditionDonut data={byCondition} /></ChartCard>
                <ChartCard title="Inventaris per Lokasi" empty={byLocation.length === 0}><HorizontalBars data={byLocation} /></ChartCard>
              </div>
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-4">
              <h2 className="mb-1 text-sm font-semibold">Perlu Perawatan</h2>
              {due.isLoading ? <div className="space-y-3 py-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                : due.isError ? <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">Gagal memuat jadwal perawatan.</p>
                : due.data && due.data.items.length > 0 ? <MaintenanceList items={due.data.items} />
                : <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600 dark:text-slate-400"><CheckCircle2 size={18} className="text-green-600" /> Tidak ada perawatan yang jatuh tempo.</p>}
            </section>
            {canSeeActivity && (
              <section className="card p-4">
                <h2 className="mb-1 text-sm font-semibold">Aktivitas Terbaru</h2>
                {activity.isLoading ? <div className="space-y-3 py-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  : activity.isError ? <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">Gagal memuat aktivitas.</p>
                  : activity.data && activity.data.length > 0 ? <ActivityList logs={activity.data} />
                  : <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">Belum ada aktivitas.</p>}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}
