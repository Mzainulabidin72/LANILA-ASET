import { describe, it, expect } from 'vitest'
import { buildSearchClause, cleanSearch, isValidRange, lateDays, loanState, matchesTab, type LoanTab } from './loans.ts'

const TODAY = '2026-10-23'
const loans = [
  { name: 'masih lama', return_date: null, due_date: '2026-11-01' },
  { name: 'jatuh tempo hari ini', return_date: null, due_date: '2026-10-23' },
  { name: 'tanpa jatuh tempo', return_date: null, due_date: null },
  { name: 'terlambat 1 hari', return_date: null, due_date: '2026-10-22' },
  { name: 'terlambat 30 hari', return_date: null, due_date: '2026-09-23' },
  { name: 'sudah kembali tepat waktu', return_date: '2026-10-20', due_date: '2026-10-25' },
  { name: 'kembali terlambat', return_date: '2026-10-10', due_date: '2026-10-01' },
]

describe('loanState', () => {
  it('jatuh tempo hari ini BELUM terlambat; kemarin sudah terlambat', () => {
    expect(loanState(loans[1], TODAY)).toBe('dipinjam')
    expect(loanState(loans[3], TODAY)).toBe('terlambat')
  })
  it('tanpa jatuh tempo tidak pernah terlambat', () => {
    expect(loanState(loans[2], TODAY)).toBe('dipinjam')
  })
  it('yang sudah dikembalikan selalu "dikembalikan", walau dulu terlambat', () => {
    expect(loanState(loans[6], TODAY)).toBe('dikembalikan')
  })
})

describe('matchesTab', () => {
  const tabs: LoanTab[] = ['active', 'overdue', 'returned']
  it('tiga tab status saling lepas dan lengkap: tiap peminjaman tepat di satu tab', () => {
    for (const l of loans) {
      const hits = tabs.filter((t) => matchesTab(l, t, TODAY))
      expect(hits).toHaveLength(1)
    }
  })
  it('jumlah per tab menjumlah ke total "Semua"', () => {
    const count = (t: LoanTab) => loans.filter((l) => matchesTab(l, t, TODAY)).length
    expect(count('active') + count('overdue') + count('returned')).toBe(count('all'))
    expect(count('all')).toBe(7)
    expect(count('active')).toBe(3)
    expect(count('overdue')).toBe(2)
    expect(count('returned')).toBe(2)
  })
})

describe('lateDays', () => {
  it('menghitung hari keterlambatan; 0 jika tidak terlambat atau sudah kembali', () => {
    expect(lateDays(loans[3], TODAY)).toBe(1)
    expect(lateDays(loans[4], TODAY)).toBe(30)
    expect(lateDays(loans[0], TODAY)).toBe(0)
    expect(lateDays(loans[6], TODAY)).toBe(0)
  })
})

describe('pencarian & filter', () => {
  it('cleanSearch membuang karakter berbahaya dan merapikan spasi', () => {
    expect(cleanSearch('  laptop,  (dell)%  ')).toBe('laptop dell')
    expect(cleanSearch('a'.repeat(200))).toHaveLength(80)
  })
  it('buildSearchClause: OR aset/peminjam, hanya UUID valid', () => {
    const a = '11111111-1111-4111-8111-111111111111'
    const e = '22222222-2222-4222-8222-222222222222'
    expect(buildSearchClause([a], [e])).toBe(`asset_id.in.(${a}),employee_id.in.(${e})`)
    expect(buildSearchClause([a], [])).toBe(`asset_id.in.(${a})`)
    expect(buildSearchClause(['x); drop table'], [])).toBeNull()
    expect(buildSearchClause([], [])).toBeNull()
  })
  it('isValidRange', () => {
    expect(isValidRange('2026-01-01', '2026-02-01')).toBe(true)
    expect(isValidRange('2026-03-01', '2026-02-01')).toBe(false)
    expect(isValidRange('', '2026-02-01')).toBe(true)
  })
})
