import { Boxes, Wallet, Wrench, HandCoins } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatRupiah } from '@/lib/format'

/** TAHAP 2: kerangka dashboard. Data asli + grafik dibuat di TAHAP 3. */
export default function DashboardPage() {
  const { profile } = useAuth()
  const stats = [
    { label: 'Total Aset', value: '0', icon: Boxes },
    { label: 'Nilai Total Aset', value: formatRupiah(0), icon: Wallet },
    { label: 'Sedang Dipinjam', value: '0', icon: HandCoins },
    { label: 'Butuh Perawatan', value: '0', icon: Wrench },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {profile?.full_name?.split(' ')[0] ?? 'Pengguna'} 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ringkasan aset Anda akan tampil di sini.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Icon size={16} /> {label}
            </div>
            <p className="text-xl font-bold lg:text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">
        Grafik aset per kategori, kondisi, lokasi, dan aktivitas terbaru akan ditambahkan di <b>Tahap 3</b>.
      </div>
    </div>
  )
}
