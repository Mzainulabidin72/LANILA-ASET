import type { ReactNode } from 'react'
import { Boxes, Coins, Scale, TrendingUp } from 'lucide-react'
import Money from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import type { PortfolioSummary } from '@/lib/wealth/calc'
import { formatPercent } from '@/lib/wealth/format'

interface Props { summary: PortfolioSummary; loading?: boolean }

function Card({ icon: Icon, label, children, note, loading }: { icon: typeof Boxes; label: string; children: ReactNode; note?: string; loading?: boolean }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="rounded-lg bg-brand-50 p-1.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon size={16} /></span>
        {label}
      </div>
      {loading ? <Skeleton className="h-8 w-32" /> : <div className="truncate text-xl font-bold lg:text-2xl">{children}</div>}
      {note && !loading && <p className="mt-1.5 text-xs leading-snug text-slate-600 dark:text-slate-400">{note}</p>}
    </div>
  )
}

export default function SummaryCards({ summary: s, loading }: Props) {
  const gainTone = s.gainAssetCount === 0 ? '' : s.gainIdr >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
  const valueNote = [
    s.estimatedCount > 0 ? `${s.estimatedCount} aset masih perkiraan dari harga perolehan.` : '',
    s.excludedCount > 0 ? `${s.excludedCount} aset belum bernilai atau belum berkurs, tidak ikut total.` : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card icon={Coins} label="Total Nilai Aset" loading={loading} note={valueNote || 'Perkiraan nilai seluruh aset aktif (IDR).'}>
        <Money value={s.totalValueIdr} />
      </Card>
      <Card icon={Scale} label="Total Harga Perolehan" loading={loading} note="Kas tidak punya harga perolehan.">
        <Money value={s.totalCostIdr} />
      </Card>
      <Card
        icon={TrendingUp}
        label="Untung/Rugi Belum Terealisasi"
        loading={loading}
        note={s.gainAssetCount > 0 ? `Dari ${s.gainAssetCount} aset investasi dengan harga terkini.` : 'Muncul setelah harga terkini saham, reksa dana, kripto, atau emas diisi.'}
      >
        {s.gainAssetCount > 0 ? (
          <span className={gainTone}>
            <Money value={s.gainIdr} signed /> <span className="text-sm font-semibold">({formatPercent(s.gainPct)})</span>
          </span>
        ) : '—'}
      </Card>
      <Card icon={Boxes} label="Jumlah Aset" loading={loading} note="Tidak termasuk aset yang diarsipkan.">
        {s.count}
      </Card>
    </div>
  )
}
