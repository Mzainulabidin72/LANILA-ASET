import { describe, it, expect } from 'vitest'
import { defaultValues, fieldsFor, fromAsset, parseDecimal, toRow, validate, type AssetLike } from './form.ts'

const NOW = new Date('2026-10-22T10:00:00')

describe('parseDecimal', () => {
  it('menerima angka biasa dan desimal koma/titik', () => {
    expect(parseDecimal('1500')).toBe(1500)
    expect(parseDecimal('1500,50')).toBe(1500.5)
    expect(parseDecimal('1.5')).toBe(1.5)
    expect(parseDecimal(' 0,00012345 ')).toBe(0.00012345)
  })
  it('menolak pemisah ribuan, negatif, dan teks', () => {
    expect(parseDecimal('1.500.000')).toBeNull()
    expect(parseDecimal('-5')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('')).toBeNull()
  })
})

describe('validate', () => {
  const stock = () => ({ ...defaultValues('stock', NOW), name: 'Bank Central Asia Tbk', symbol: 'bbca', quantity: '100', avg_price: '9000' })

  it('saham valid tidak punya error', () => {
    expect(validate('stock', stock(), NOW)).toEqual({})
  })
  it('kolom wajib ditandai', () => {
    const e = validate('stock', { ...stock(), symbol: '', name: '' }, NOW)
    expect(e.symbol).toBeTruthy()
    expect(e.name).toBeTruthy()
  })
  it('jumlah saham "1.500" ditolak karena ambigu', () => {
    const e = validate('stock', { ...stock(), quantity: '1.500' }, NOW)
    expect(e.quantity).toContain('pemisah ribuan')
  })
  it('jumlah kripto 0,001 diterima (desimal wajar)', () => {
    const v = { ...defaultValues('crypto', NOW), name: 'Bitcoin', symbol: 'BTC', quantity: '0.001', avg_price: '1000000000' }
    expect(validate('crypto', v, NOW)).toEqual({})
  })
  it('mata uang asing wajib kurs', () => {
    const v = { ...stock(), currency: 'USD' }
    expect(fieldsFor('stock', v).some((f) => f.key === 'fx_rate')).toBe(true)
    expect(validate('stock', v, NOW).fx_rate).toBeTruthy()
    expect(validate('stock', { ...v, fx_rate: '16000' }, NOW)).toEqual({})
  })
  it('IDR tidak meminta kurs', () => {
    expect(fieldsFor('stock', stock()).some((f) => f.key === 'fx_rate')).toBe(false)
  })
  it('tanggal masa depan ditolak, jatuh tempo sebelum penempatan ditolak', () => {
    expect(validate('stock', { ...stock(), acquisition_date: '2027-01-01' }, NOW).acquisition_date).toBeTruthy()
    const dep = { ...defaultValues('deposit', NOW), name: 'Deposito', institution: 'BCA', total_cost: '10000000', acquisition_date: '2026-06-01', maturity_date: '2026-05-01' }
    expect(validate('deposit', dep, NOW).maturity_date).toBeTruthy()
  })
  it('4 digit terakhir rekening: lebih dari 4 karakter ditolak (nomor lengkap tidak disimpan)', () => {
    const cash = { ...defaultValues('cash', NOW), name: 'Tabungan', institution: 'BCA', current_value: '1000000', account_last4: '1234567890' }
    expect(validate('cash', cash, NOW).account_last4).toBeTruthy()
    expect(validate('cash', { ...cash, account_last4: '7890' }, NOW)).toEqual({})
  })
  it('kas wajib saldo', () => {
    const cash = { ...defaultValues('cash', NOW), name: 'Tabungan', institution: 'BCA' }
    expect(validate('cash', cash, NOW).current_value).toBeTruthy()
  })
})

describe('toRow', () => {
  const ctx = { userId: 'user-1', now: NOW }

  it('saham: harga perolehan = jumlah x harga rata-rata + biaya; simbol huruf besar; pribadi', () => {
    const v = { ...defaultValues('stock', NOW), name: 'BCA', symbol: 'bbca', quantity: '100', avg_price: '9000', fees: '5000' }
    const r = toRow('stock', v, ctx)
    expect(r.acquisition_price).toBe(905000)
    expect(r.symbol).toBe('BBCA')
    expect(r.visibility).toBe('private')
    expect(r.owner_id).toBe('user-1')
    expect(r.fees).toBe(5000)
    expect(r.valued_at).toBeNull() // belum ada harga terkini: tidak ada valuasi palsu
    expect(r.fx_rate).toBeNull()
  })
  it('saham dengan harga terkini mencatat tanggal valuasi', () => {
    const v = { ...defaultValues('stock', NOW), name: 'BCA', symbol: 'BBCA', quantity: '10', avg_price: '9000', unit_price: '9500' }
    const r = toRow('stock', v, ctx)
    expect(r.current_unit_price).toBe(9500)
    expect(typeof r.valued_at).toBe('string')
  })
  it('kas: tidak ada harga perolehan, saldo tersimpan, hanya 4 digit terakhir', () => {
    const v = { ...defaultValues('cash', NOW), name: 'Tabungan', institution: 'BCA', current_value: '2500000', account_last4: '7890' }
    const r = toRow('cash', v, ctx)
    expect(r.acquisition_price).toBe(0)
    expect(r.current_value).toBe(2500000)
    expect(r.account_last4).toBe('7890')
    expect((r.extra as Record<string, string>).account_type).toBe('Tabungan')
  })
  it('elektronik: default bersama (inventaris), pemilik kosong; bisa dijadikan pribadi', () => {
    const base = { ...defaultValues('valuable', NOW), name: 'Laptop', total_cost: '15000000' }
    expect(base.visibility).toBe('shared')
    const shared = toRow('valuable', base, ctx)
    expect(shared.visibility).toBe('shared')
    expect(shared.owner_id).toBeNull()
    const priv = toRow('valuable', { ...base, visibility: 'private' }, ctx)
    expect(priv.owner_id).toBe('user-1')
  })
  it('aset keuangan tidak bisa dijadikan bersama walau form mengirim "shared"', () => {
    const v = { ...defaultValues('cash', NOW), name: 'X', institution: 'Y', current_value: '1', visibility: 'shared' }
    expect(toRow('cash', v, ctx).visibility).toBe('private')
  })
  it('mata uang asing menyimpan kurs; IDR mengosongkan kurs', () => {
    const usd = { ...defaultValues('crypto', NOW), name: 'BTC', symbol: 'btc', quantity: '1', avg_price: '100', currency: 'USD', fx_rate: '16000', unit_price: '120' }
    expect(toRow('crypto', usd, ctx).fx_rate).toBe(16000)
    expect(toRow('crypto', { ...usd, currency: 'IDR' }, ctx).fx_rate).toBeNull()
  })
  it('menyimpan ulang tanpa mengubah tanggal valuasi mempertahankan jam aslinya (tidak membuat riwayat ganda)', () => {
    const original = new Date('2026-10-20T08:15:00').toISOString()
    const v = { ...defaultValues('stock', NOW), name: 'BCA', symbol: 'BBCA', quantity: '10', avg_price: '9000', unit_price: '9500', valued_at: '2026-10-20' }
    expect(toRow('stock', v, { ...ctx, existingValuedAt: original }).valued_at).toBe(original)
  })
})

describe('fromAsset', () => {
  it('bolak-balik saham: harga rata-rata dipulihkan dari total biaya dikurangi fee', () => {
    const a: AssetLike = {
      asset_class: 'stock', name: 'BCA', currency: 'IDR', institution: 'Ajaib', symbol: 'BBCA', account_last4: null,
      quantity: 100, fees: 5000, acquisition_price: 905000, acquisition_date: '2026-01-10', current_unit_price: 9500,
      current_value: null, valued_at: '2026-10-20T08:00:00', fx_rate: null, interest_rate: null, maturity_date: null,
      category_id: null, brand: null, model: null, serial_number: null, location_id: null, responsible_employee_id: null,
      condition: 'baik', notes: null, visibility: 'private', extra: { exchange: 'IDX' },
    }
    const v = fromAsset(a, NOW)
    expect(v.avg_price).toBe('9000')
    expect(v.quantity).toBe('100')
    expect(v.exchange).toBe('IDX')
    expect(validate('stock', v, NOW)).toEqual({})
  })
})
