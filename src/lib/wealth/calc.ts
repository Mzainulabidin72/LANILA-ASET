// Perhitungan kekayaan: fungsi MURNI (tanpa React/Supabase) supaya mudah diuji.
// Aturan inti:
//  - Nilai pasar = jumlah x harga terkini. Tidak ada harga pasar yang dikarang: semua nilai berasal dari input pengguna.
//  - Kas/rekening memakai saldo terakhir. Tidak pernah dihitung sebagai untung/rugi.
//  - Untung/rugi belum terealisasi HANYA untuk saham, reksa dana/obligasi, kripto, emas dengan nilai terkini yang
//    benar-benar diisi (bukan perkiraan dari harga perolehan).
//  - Mata uang selain IDR hanya masuk total jika kurs ke IDR diisi pengguna. Tidak ada kurs yang dikarang.
import type { AssetClass } from '../../types/wealth.ts'

export const GAIN_ELIGIBLE: readonly AssetClass[] = ['stock', 'fund', 'crypto', 'gold']

export type ValuationBasis =
  | 'market-unit'   // jumlah x harga terkini (manual)
  | 'manual-total'  // total nilai/saldo yang diisi pengguna
  | 'book'          // pokok (deposito) tanpa nilai terkini
  | 'cost-fallback' // belum ada nilai terkini: sementara memakai harga perolehan
  | 'none'          // tidak ada nilai sama sekali

export interface ValuationInput {
  asset_class: AssetClass | string
  currency?: string | null
  fx_rate?: number | string | null
  quantity?: number | string | null
  acquisition_price?: number | string | null
  current_unit_price?: number | string | null
  current_value?: number | string | null
}

export interface AssetValuation {
  currency: string
  value: number | null
  basis: ValuationBasis
  cost: number | null
  gain: number | null
  gainPct: number | null
  gainEligible: boolean
  /** mata uang asing tanpa kurs: tidak ikut total IDR */
  needsFx: boolean
  valueIdr: number | null
  costIdr: number | null
  gainIdr: number | null
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

export function rateToIdr(currency: string, fx: unknown): number | null {
  if (currency === 'IDR') return 1
  const r = num(fx)
  return r !== null && r > 0 ? r : null
}

export function computeValuation(a: ValuationInput): AssetValuation {
  const cls = a.asset_class as AssetClass
  const currency = (a.currency || 'IDR').toUpperCase()
  const qty = num(a.quantity)
  const unit = num(a.current_unit_price)
  const manual = num(a.current_value)
  const acq = num(a.acquisition_price)
  const cost = cls === 'cash' ? null : acq !== null && acq > 0 ? acq : null

  let value: number | null = null
  let basis: ValuationBasis = 'none'

  if (cls === 'cash') {
    if (manual !== null) { value = manual; basis = 'manual-total' }
  } else if (cls === 'deposit') {
    if (manual !== null) { value = manual; basis = 'manual-total' }
    else if (cost !== null) { value = cost; basis = 'book' }
  } else if (GAIN_ELIGIBLE.includes(cls)) {
    if (qty !== null && qty > 0 && unit !== null) { value = round2(qty * unit); basis = 'market-unit' }
    else if (manual !== null) { value = manual; basis = 'manual-total' }
    else if (cost !== null) { value = cost; basis = 'cost-fallback' }
  } else {
    // properti, kendaraan, barang berharga, lainnya: estimasi manual, jika tidak ada pakai harga perolehan
    if (manual !== null) { value = manual; basis = 'manual-total' }
    else if (cost !== null) { value = cost; basis = 'cost-fallback' }
  }

  const rate = rateToIdr(currency, a.fx_rate)
  const needsFx = value !== null && rate === null

  const gainEligible =
    GAIN_ELIGIBLE.includes(cls) && (basis === 'market-unit' || basis === 'manual-total') && value !== null && cost !== null
  const gain = gainEligible && value !== null && cost !== null ? round2(value - cost) : null
  const gainPct = gain !== null && cost !== null && cost > 0 ? (gain / cost) * 100 : null

  return {
    currency,
    value,
    basis,
    cost,
    gain,
    gainPct,
    gainEligible,
    needsFx,
    valueIdr: value !== null && rate !== null ? round2(value * rate) : null,
    costIdr: cost !== null && rate !== null ? round2(cost * rate) : null,
    gainIdr: gain !== null && rate !== null ? round2(gain * rate) : null,
  }
}

export interface PortfolioItem extends ValuationInput {
  status?: string | null
}

export interface ClassAllocation { cls: string; valueIdr: number; count: number; pct: number }

export interface PortfolioSummary {
  /** jumlah aset aktif (tidak diarsipkan) */
  count: number
  totalValueIdr: number
  /** total harga perolehan yang tercatat (kas tidak punya harga perolehan) */
  totalCostIdr: number
  /** untung/rugi belum terealisasi: hanya aset yang memenuhi syarat */
  gainIdr: number
  gainBaseIdr: number
  gainPct: number | null
  gainAssetCount: number
  /** aset tanpa nilai, atau mata uang asing tanpa kurs (tidak ikut total) */
  excludedCount: number
  /** aset yang nilainya masih perkiraan dari harga perolehan */
  estimatedCount: number
  byClass: ClassAllocation[]
}

export function isArchived(status: unknown): boolean {
  return status === 'dihapus'
}

export function summarize(items: PortfolioItem[]): PortfolioSummary {
  const active = items.filter((i) => !isArchived(i.status))
  let totalValueIdr = 0
  let totalCostIdr = 0
  let gainIdr = 0
  let gainBaseIdr = 0
  let gainAssetCount = 0
  let excludedCount = 0
  let estimatedCount = 0
  const byClassMap = new Map<string, { value: number; count: number }>()

  for (const a of active) {
    const v = computeValuation(a)
    if (v.costIdr !== null) totalCostIdr += v.costIdr
    if (v.valueIdr === null) { excludedCount++; continue }
    totalValueIdr += v.valueIdr
    if (v.basis === 'cost-fallback') estimatedCount++
    if (v.gainEligible && v.gainIdr !== null && v.costIdr !== null) {
      gainIdr += v.gainIdr
      gainBaseIdr += v.costIdr
      gainAssetCount++
    }
    const entry = byClassMap.get(String(a.asset_class)) ?? { value: 0, count: 0 }
    entry.value += v.valueIdr
    entry.count += 1
    byClassMap.set(String(a.asset_class), entry)
  }

  const byClass: ClassAllocation[] = [...byClassMap.entries()]
    .map(([cls, e]) => ({
      cls,
      valueIdr: round2(e.value),
      count: e.count,
      pct: totalValueIdr > 0 ? (e.value / totalValueIdr) * 100 : 0,
    }))
    .sort((a, b) => b.valueIdr - a.valueIdr)

  return {
    count: active.length,
    totalValueIdr: round2(totalValueIdr),
    totalCostIdr: round2(totalCostIdr),
    gainIdr: round2(gainIdr),
    gainBaseIdr: round2(gainBaseIdr),
    gainPct: gainBaseIdr > 0 ? (gainIdr / gainBaseIdr) * 100 : null,
    gainAssetCount,
    excludedCount,
    estimatedCount,
    byClass,
  }
}

/** Harga pasar dianggap basi jika terakhir diperbarui lebih dari `days` hari lalu (hanya untuk aset berbasis harga). */
export function isStale(valuedAt: string | null | undefined, now: Date = new Date(), days = 30): boolean {
  if (!valuedAt) return true
  const t = Date.parse(valuedAt)
  if (Number.isNaN(t)) return true
  return now.getTime() - t > days * 86_400_000
}

export function maskLast4(last4: string | null | undefined): string {
  return last4 ? `•••• ${last4}` : ''
}

/** Rata-rata harga beli per unit dari total biaya (termasuk biaya transaksi). */
export function averagePrice(totalCost: number | null, fees: number | null, quantity: number | null): number | null {
  if (totalCost === null || quantity === null || quantity <= 0) return null
  return (totalCost - (fees ?? 0)) / quantity
}
