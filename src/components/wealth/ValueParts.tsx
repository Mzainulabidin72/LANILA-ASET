import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import Money from '@/components/ui/Money'
import { isStale, type AssetValuation } from '@/lib/wealth/calc'
import { formatPercent } from '@/lib/wealth/format'
import { GAIN_CLASSES, type AssetClass } from '@/types/wealth'

const TAG = 'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold'

/** Penanda keandalan nilai: belum dinilai, kurs belum diisi, atau perkiraan dari harga perolehan. */
export function BasisTag({ v }: { v: AssetValuation }) {
  if (v.value === null) return <span className={`${TAG} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200`}>Belum dinilai</span>
  if (v.needsFx) return <span className={`${TAG} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300`}>Kurs belum diisi</span>
  if (v.basis === 'cost-fallback') return <span className={`${TAG} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200`}>Perkiraan (harga perolehan)</span>
  return null
}

export function ValueCell({ v }: { v: AssetValuation }) {
  return (
    <div className="space-y-0.5">
      <div className="font-semibold"><Money value={v.value} currency={v.currency} /></div>
      {v.currency !== 'IDR' && v.valueIdr !== null && (
        <div className="text-xs text-slate-600 dark:text-slate-400">≈ <Money value={v.valueIdr} /></div>
      )}
      <BasisTag v={v} />
    </div>
  )
}

/** Untung/rugi: tanda +/- dan panah (tidak hanya warna). Strip jika tidak berlaku. */
export function GainCell({ v }: { v: AssetValuation }) {
  if (v.gain === null) {
    return <span className="text-slate-600 dark:text-slate-400" title="Tidak berlaku, atau nilai terkini belum diisi">—</span>
  }
  const up = v.gain >= 0
  const tone = up ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <div className={`space-y-0.5 ${tone}`}>
      <div className="inline-flex items-center gap-1 font-semibold"><Icon size={14} aria-hidden="true" /><Money value={v.gain} currency={v.currency} signed /></div>
      <div className="text-xs">{formatPercent(v.gainPct)}</div>
    </div>
  )
}

export function UpdatedCell({ cls, valuedAt, updatedAt }: { cls: AssetClass; valuedAt: string | null; updatedAt: string }) {
  const date = valuedAt ?? updatedAt
  const stale = GAIN_CLASSES.includes(cls) && isStale(valuedAt)
  return (
    <div className="space-y-0.5">
      <div>{new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
      {stale && <span className={`${TAG} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300`}>Perlu diperbarui</span>}
    </div>
  )
}
