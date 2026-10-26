import { describe, it, expect } from 'vitest'
import { buildMaintSearch, daysUntil, isDueSoon, maintState, matchesTab, type MaintTab } from './maintenance.ts'

const TODAY = '2026-10-23'
const rows = [
  { name: 'jadwal jauh', status: 'terjadwal' as const, scheduled_date: '2026-12-01' },
  { name: 'jadwal hari ini', status: 'terjadwal' as const, scheduled_date: '2026-10-23' },
  { name: 'jadwal 7 hari lagi', status: 'terjadwal' as const, scheduled_date: '2026-10-30' },
  { name: 'jadwal 8 hari lagi', status: 'terjadwal' as const, scheduled_date: '2026-10-31' },
  { name: 'terlambat 1 hari', status: 'terjadwal' as const, scheduled_date: '2026-10-22' },
  { name: 'selesai (dulu terlambat)', status: 'selesai' as const, scheduled_date: '2026-09-01' },
  { name: 'selesai (jadwal masa depan)', status: 'selesai' as const, scheduled_date: '2026-12-31' },
  { name: 'dibatalkan, tanggal lewat', status: 'dibatalkan' as const, scheduled_date: '2026-08-01' },
]

describe('maintState', () => {
  it('jadwal hari ini BELUM terlambat; kemarin sudah terlambat', () => {
    expect(maintState(rows[1], TODAY)).toBe('terjadwal')
    expect(maintState(rows[4], TODAY)).toBe('terlambat')
  })
  it('yang selesai tidak pernah menjadi terlambat, walau tanggal jadwalnya sudah lewat', () => {
    expect(maintState(rows[5], TODAY)).toBe('selesai')
  })
  it('yang dibatalkan tidak dihitung terlambat', () => {
    expect(maintState(rows[7], TODAY)).toBe('dibatalkan')
  })
})

describe('tab & hitungan', () => {
  const tabs: MaintTab[] = ['upcoming', 'overdue', 'done']
  it('tiga tab status tidak pernah tumpang tindih (maks. satu tab per catatan)', () => {
    for (const r of rows) expect(tabs.filter((t) => matchesTab(r, t, TODAY)).length <= 1).toBe(true)
  })
  it('setiap catatan punya tepat satu dari empat status; jumlah semuanya = total', () => {
    const c = { terjadwal: 0, terlambat: 0, selesai: 0, dibatalkan: 0 }
    for (const r of rows) c[maintState(r, TODAY)]++
    expect(c.terjadwal + c.terlambat + c.selesai + c.dibatalkan).toBe(rows.length)
    expect(c).toEqual({ terjadwal: 4, terlambat: 1, selesai: 2, dibatalkan: 1 })
  })
  it('yang dibatalkan hanya tampil di tab "Semua"', () => {
    expect(tabs.some((t) => matchesTab(rows[7], t, TODAY))).toBe(false)
    expect(matchesTab(rows[7], 'all', TODAY)).toBe(true)
  })
})

describe('segera jatuh tempo', () => {
  it('0-7 hari = segera; 8 hari = belum; terlambat/selesai bukan segera', () => {
    expect(isDueSoon(rows[1], TODAY)).toBe(true)
    expect(isDueSoon(rows[2], TODAY)).toBe(true)
    expect(isDueSoon(rows[3], TODAY)).toBe(false)
    expect(isDueSoon(rows[4], TODAY)).toBe(false)
    expect(isDueSoon(rows[5], TODAY)).toBe(false)
  })
  it('daysUntil', () => {
    expect(daysUntil(rows[2], TODAY)).toBe(7)
    expect(daysUntil(rows[4], TODAY)).toBe(-1)
  })
})

describe('buildMaintSearch', () => {
  it('menggabungkan judul, keterangan, penanggung jawab, dan aset dalam satu klausa OR', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(buildMaintSearch('AC', [id])).toBe(`title.ilike.%AC%,description.ilike.%AC%,performed_by.ilike.%AC%,asset_id.in.(${id})`)
  })
  it('tanpa aset yang cocok tetap mencari di kolom perawatan; UUID palsu dibuang; kata kunci dibersihkan', () => {
    expect(buildMaintSearch('servis', [])).toBe('title.ilike.%servis%,description.ilike.%servis%,performed_by.ilike.%servis%')
    expect(buildMaintSearch('x', ['bukan-uuid); drop'])).toBe('title.ilike.%x%,description.ilike.%x%,performed_by.ilike.%x%')
    expect(buildMaintSearch(' a,(b)% ', [])).toBe('title.ilike.%a b%,description.ilike.%a b%,performed_by.ilike.%a b%')
  })
  it('kata kunci kosong = tanpa filter', () => {
    expect(buildMaintSearch('   ', [])).toBeNull()
  })
})
