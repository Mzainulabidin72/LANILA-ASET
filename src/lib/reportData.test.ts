import { describe, it, expect } from 'vitest'
import { groupAssets, pageSlice, periodText, reportFileName, sumPrice, type ReportAsset } from './reportData.ts'

const a = (code: string, o: Partial<ReportAsset>): ReportAsset => ({
  asset_code: code, name: code, category: '', brand: '', model: '', serial_number: '', acquisition_date: null,
  acquisition_price: 0, location: '', employee: '', condition: 'baik', status: 'aktif', ...o,
})

const rows: ReportAsset[] = [
  a('A1', { location: 'Gudang', condition: 'baik', acquisition_price: 1_000_000 }),
  a('A2', { location: 'Gudang', condition: 'rusak_ringan', acquisition_price: 500_000.5 }),
  a('A3', { location: 'Lantai 1', condition: 'baik', acquisition_price: 2_000_000 }),
  a('A4', { location: '', condition: 'hilang', acquisition_price: 250_000 }),
  a('A5', { location: 'Aula', condition: 'baik', acquisition_price: 0 }),
]

describe('reportFileName', () => {
  it('memakai pola lanila-aset-<jenis>-<tanggal>.<ekstensi>', () => {
    const now = new Date(2026, 9, 27)
    expect(reportFileName('assets', 'xlsx', now)).toBe('lanila-aset-daftar-aset-2026-10-27.xlsx')
    expect(reportFileName('by_location', 'pdf', now)).toBe('lanila-aset-aset-per-lokasi-2026-10-27.pdf')
    expect(reportFileName('by_condition', 'xlsx', now)).toBe('lanila-aset-aset-per-kondisi-2026-10-27.xlsx')
    expect(reportFileName('loans', 'pdf', now)).toBe('lanila-aset-riwayat-peminjaman-2026-10-27.pdf')
  })
  it('tanggal satu digit diberi nol di depan', () => {
    expect(reportFileName('assets', 'pdf', new Date(2026, 0, 5))).toBe('lanila-aset-daftar-aset-2026-01-05.pdf')
  })
})

describe('groupAssets: per lokasi', () => {
  const g = groupAssets(rows, 'by_location')
  it('A-Z dan "Tanpa lokasi" selalu terakhir', () => {
    expect(g.map((x) => x.label)).toEqual(['Aula', 'Gudang', 'Lantai 1', 'Tanpa lokasi'])
  })
  it('jumlah dan subtotal tiap kelompok dihitung dari data yang difilter', () => {
    const gudang = g.find((x) => x.label === 'Gudang')!
    expect(gudang.count).toBe(2)
    expect(gudang.total).toBe(1_500_000.5)
  })
  it('jumlah semua kelompok = jumlah data; subtotal semua kelompok = total keseluruhan', () => {
    expect(g.reduce((s, x) => s + x.count, 0)).toBe(rows.length)
    expect(Math.round(g.reduce((s, x) => s + x.total, 0) * 100) / 100).toBe(sumPrice(rows))
  })
})

describe('groupAssets: per kondisi', () => {
  const g = groupAssets(rows, 'by_condition')
  it('urutan tetap Baik, Rusak Ringan, Rusak Berat, Hilang; kelompok kosong dihilangkan', () => {
    expect(g.map((x) => x.label)).toEqual(['Baik', 'Rusak Ringan', 'Hilang'])
  })
  it('persentase dihitung dari seluruh data yang cocok dan berjumlah 100', () => {
    expect(g.find((x) => x.label === 'Baik')!.pct).toBe(60)
    expect(g.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100, 6)
  })
  it('data kosong tidak menghasilkan kelompok maupun NaN', () => {
    expect(groupAssets([], 'by_condition')).toHaveLength(0)
    expect(groupAssets([], 'by_location')).toHaveLength(0)
  })
})

describe('periodText', () => {
  it('semua kombinasi batas tanggal', () => {
    expect(periodText('2026-01-01', '2026-03-31')).toBe('01/01/2026 s.d. 31/03/2026')
    expect(periodText('2026-01-01', '')).toBe('mulai 01/01/2026')
    expect(periodText('', '2026-03-31')).toBe('sampai 31/03/2026')
    expect(periodText('', '')).toBe('Semua periode')
  })
})

describe('pageSlice', () => {
  const list = Array.from({ length: 45 }, (_, i) => i + 1)
  it('membedakan total yang cocok dari baris yang sedang tampil', () => {
    const p = pageSlice(list, 2, 20)
    expect(p.total).toBe(45)
    expect(p.items).toHaveLength(20)
    expect(p.from).toBe(21)
    expect(p.to).toBe(40)
    expect(p.pages).toBe(3)
  })
  it('halaman terakhir sebagian; halaman di luar jangkauan dirapikan; data kosong aman', () => {
    expect(pageSlice(list, 3, 20).items).toHaveLength(5)
    expect(pageSlice(list, 99, 20).page).toBe(3)
    expect(pageSlice(list, 0, 20).page).toBe(1)
    const e = pageSlice([], 1, 20)
    expect(e.total).toBe(0)
    expect(e.from).toBe(0)
    expect(e.to).toBe(0)
  })
})

import { buildGroupedRows } from './reportData.ts'

describe('buildGroupedRows (baris Excel berkelompok)', () => {
  const COLS = 4
  const MONEY = 3
  const opts = {
    groupLabel: 'Lokasi',
    columns: COLS,
    moneyIdx: MONEY,
    rowOf: (r: ReportAsset, n: number) => [n, r.asset_code, r.name, r.acquisition_price] as (string | number | null)[],
  }
  const groups = groupAssets(rows, 'by_location')
  const out = buildGroupedRows(groups, opts)

  it('setiap baris selalu selebar jumlah kolom tabel', () => {
    for (const r of out) expect(r).toHaveLength(COLS)
  })
  it('judul grup, subtotal, baris kosong, dan total tersusun benar', () => {
    const labels = out.map((r) => (typeof r[1] === 'string' && (r[1] as string).startsWith('LOKASI:') ? r[1] : null)).filter(Boolean)
    expect(labels).toEqual(['LOKASI: Aula (1 aset)', 'LOKASI: Gudang (2 aset)', 'LOKASI: Lantai 1 (1 aset)', 'LOKASI: Tanpa lokasi (1 aset)'])
    const last = out[out.length - 1]
    expect(last[2]).toBe('TOTAL (5 aset)')
  })
  it('nomor urut berlanjut antar grup (1..5) tanpa lompat atau ulang', () => {
    const nums = out.filter((r) => typeof r[0] === 'number').map((r) => r[0])
    expect(nums).toEqual([1, 2, 3, 4, 5])
  })
  it('subtotal berupa angka; jumlah semua subtotal = angka TOTAL = jumlah harga seluruh aset', () => {
    const subs = out.filter((r) => typeof r[2] === 'string' && (r[2] as string).startsWith('Subtotal')).map((r) => r[MONEY] as number)
    const sumSubs = Math.round(subs.reduce((s, x) => s + x, 0) * 100) / 100
    const total = out[out.length - 1][MONEY] as number
    expect(sumSubs).toBe(total)
    expect(total).toBe(sumPrice(rows))
  })
  it('jumlah baris aset di hasil = jumlah data (tidak ada yang hilang atau ganda)', () => {
    expect(out.filter((r) => typeof r[0] === 'number')).toHaveLength(rows.length)
  })
})
