import { describe, it, expect } from 'vitest'
import { averagePrice, computeValuation, isStale, maskLast4, round2, summarize } from './calc.ts'

describe('computeValuation', () => {
  it('saham: nilai pasar = jumlah x harga terkini, untung/rugi dari biaya beli + fee', () => {
    const v = computeValuation({ asset_class: 'stock', quantity: 100, acquisition_price: 905000, current_unit_price: 9500 })
    expect(v.value).toBe(950000)
    expect(v.basis).toBe('market-unit')
    expect(v.cost).toBe(905000)
    expect(v.gain).toBe(45000)
    expect(v.gainPct).toBeCloseTo(4.9724, 3)
    expect(v.gainEligible).toBe(true)
  })

  it('saham tanpa harga terkini: pakai harga perolehan sebagai perkiraan, TANPA untung/rugi', () => {
    const v = computeValuation({ asset_class: 'stock', quantity: 100, acquisition_price: 900000 })
    expect(v.value).toBe(900000)
    expect(v.basis).toBe('cost-fallback')
    expect(v.gain).toBeNull()
    expect(v.gainEligible).toBe(false)
  })

  it('kas: memakai saldo, tidak pernah untung/rugi walau ada harga perolehan', () => {
    const v = computeValuation({ asset_class: 'cash', current_value: 5_000_000, acquisition_price: 1_000_000 })
    expect(v.value).toBe(5_000_000)
    expect(v.cost).toBeNull()
    expect(v.gain).toBeNull()
    expect(v.gainEligible).toBe(false)
  })

  it('deposito: tanpa nilai terkini = pokok (book); dengan nilai terkini = manual; tidak pernah untung/rugi', () => {
    const a = computeValuation({ asset_class: 'deposit', acquisition_price: 10_000_000 })
    expect(a.basis).toBe('book')
    expect(a.value).toBe(10_000_000)
    const b = computeValuation({ asset_class: 'deposit', acquisition_price: 10_000_000, current_value: 10_200_000 })
    expect(b.basis).toBe('manual-total')
    expect(b.value).toBe(10_200_000)
    expect(b.gain).toBeNull()
  })

  it('kripto USD tanpa kurs: tidak masuk total IDR; dengan kurs: dikonversi', () => {
    const base = { asset_class: 'crypto', currency: 'USD', quantity: 0.5, acquisition_price: 20000, current_unit_price: 60000 }
    const no = computeValuation(base)
    expect(no.value).toBe(30000)
    expect(no.needsFx).toBe(true)
    expect(no.valueIdr).toBeNull()
    const yes = computeValuation({ ...base, fx_rate: 16000 })
    expect(yes.needsFx).toBe(false)
    expect(yes.valueIdr).toBe(480_000_000)
    expect(yes.gainIdr).toBe(160_000_000)
  })

  it('kuantitas pecahan tidak kehilangan ketelitian pada nilai', () => {
    const v = computeValuation({ asset_class: 'crypto', quantity: 0.00123456, current_unit_price: 1_000_000_000, acquisition_price: 1_000_000 })
    expect(v.value).toBe(1_234_560)
  })

  it('properti: estimasi manual dipakai; tanpa estimasi = perkiraan dari harga perolehan; tanpa untung/rugi portofolio', () => {
    const a = computeValuation({ asset_class: 'property', acquisition_price: 500_000_000, current_value: 650_000_000 })
    expect(a.basis).toBe('manual-total')
    expect(a.gainEligible).toBe(false)
    const b = computeValuation({ asset_class: 'property', acquisition_price: 500_000_000 })
    expect(b.basis).toBe('cost-fallback')
  })

  it('aset tanpa data nilai apa pun: basis none', () => {
    const v = computeValuation({ asset_class: 'vehicle' })
    expect(v.basis).toBe('none')
    expect(v.value).toBeNull()
  })

  it('nilai string dari database tetap dihitung benar', () => {
    const v = computeValuation({ asset_class: 'gold', quantity: '10', acquisition_price: '14000000', current_unit_price: '1500000' })
    expect(v.value).toBe(15_000_000)
    expect(v.gain).toBe(1_000_000)
  })
})

describe('summarize', () => {
  const items = [
    { asset_class: 'cash', status: 'aktif', current_value: 10_000_000 },
    { asset_class: 'stock', status: 'aktif', quantity: 100, acquisition_price: 900_000, current_unit_price: 10_000 }, // 1.000.000
    { asset_class: 'gold', status: 'aktif', quantity: 5, acquisition_price: 7_000_000, current_unit_price: 1_300_000 }, // 6.500.000 (rugi 500rb)
    { asset_class: 'property', status: 'aktif', acquisition_price: 2_000_000, current_value: 2_500_000 },
    { asset_class: 'crypto', status: 'aktif', currency: 'USD', quantity: 1, acquisition_price: 100, current_unit_price: 150 }, // tanpa kurs
    { asset_class: 'vehicle', status: 'aktif' }, // tanpa nilai
    { asset_class: 'stock', status: 'dihapus', quantity: 1, acquisition_price: 1, current_unit_price: 999_999 }, // diarsipkan
    { asset_class: 'fund', status: 'aktif', quantity: 1, acquisition_price: 3_000_000 }, // perkiraan
  ]
  const s = summarize(items)

  it('total nilai hanya menjumlahkan aset aktif yang punya nilai IDR', () => {
    // 10jt + 1jt + 6,5jt + 2,5jt + 3jt (perkiraan) = 23jt
    expect(s.totalValueIdr).toBe(23_000_000)
    expect(s.count).toBe(7) // arsip tidak dihitung
  })

  it('aset tanpa nilai / tanpa kurs dihitung sebagai "tidak ikut total"', () => {
    expect(s.excludedCount).toBe(2)
    expect(s.estimatedCount).toBe(1)
  })

  it('untung/rugi hanya dari aset investasi dengan nilai terkini: saham (+100rb) + emas (-500rb)', () => {
    expect(s.gainAssetCount).toBe(2)
    expect(s.gainIdr).toBe(-400_000)
    expect(s.gainBaseIdr).toBe(7_900_000)
    expect(s.gainPct).toBeCloseTo(-5.0633, 3)
  })

  it('total harga perolehan: kas tidak punya harga perolehan', () => {
    // saham 0,9jt + emas 7jt + properti 2jt + reksa dana 3jt
    expect(s.totalCostIdr).toBe(12_900_000)
  })

  it('alokasi: persentase berjumlah 100 dan terurut dari terbesar', () => {
    const sum = s.byClass.reduce((a, c) => a + c.pct, 0)
    expect(sum).toBeCloseTo(100, 6)
    expect(s.byClass[0].cls).toBe('cash')
  })

  it('portofolio kosong tidak menghasilkan NaN', () => {
    const e = summarize([])
    expect(e.totalValueIdr).toBe(0)
    expect(e.gainPct).toBeNull()
    expect(e.byClass).toHaveLength(0)
  })
})

describe('utilitas', () => {
  it('isStale: lebih dari 30 hari atau tanpa tanggal = basi', () => {
    const now = new Date('2026-10-22T00:00:00Z')
    expect(isStale('2026-09-01T00:00:00Z', now)).toBe(true)
    expect(isStale('2026-10-15T00:00:00Z', now)).toBe(false)
    expect(isStale(null, now)).toBe(true)
  })
  it('round2 dan averagePrice', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(averagePrice(905000, 5000, 100)).toBe(9000)
    expect(averagePrice(100, null, 0)).toBeNull()
  })
  it('maskLast4', () => {
    expect(maskLast4('1234')).toBe('•••• 1234')
    expect(maskLast4(null)).toBe('')
  })
})
