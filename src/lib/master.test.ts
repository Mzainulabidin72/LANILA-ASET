import { describe, it, expect } from 'vitest'
import { SEARCH_COLUMNS, inUse, masterSearchClause, usageText } from './master.ts'

describe('masterSearchClause', () => {
  it('kategori & lokasi mencari nama dan keterangan', () => {
    expect(masterSearchClause('categories', 'lap')).toBe('name.ilike.%lap%,description.ilike.%lap%')
    expect(masterSearchClause('locations', 'gud')).toBe('name.ilike.%gud%,description.ilike.%gud%')
  })
  it('pegawai mencari nama, nomor pegawai, dan jabatan (bukan telepon/email)', () => {
    const c = masterSearchClause('employees', 'budi') as string
    expect(c).toContain('full_name.ilike.%budi%')
    expect(c).toContain('employee_number.ilike.%budi%')
    expect(c).toContain('position.ilike.%budi%')
    expect(c.includes('phone')).toBe(false)
    expect(c.includes('email')).toBe(false)
  })
  it('kata kunci kosong = tanpa filter; karakter berbahaya dibuang', () => {
    expect(masterSearchClause('categories', '   ')).toBeNull()
    expect(masterSearchClause('categories', 'a,(b)%')).toBe('name.ilike.%a b%,description.ilike.%a b%')
  })
  it('tidak ada kolom yang tidak ada di skema (kode lokasi, departemen)', () => {
    const all = Object.values(SEARCH_COLUMNS).flat()
    expect(all.includes('code')).toBe(false)
    expect(all.includes('department')).toBe(false)
  })
})

describe('pemakaian', () => {
  it('inUse: dipakai jika ada aset atau peminjaman', () => {
    expect(inUse({ assets: 0, loans: 0 })).toBe(false)
    expect(inUse({ assets: 1, loans: 0 })).toBe(true)
    expect(inUse({ assets: 0, loans: 2 })).toBe(true)
    expect(inUse(undefined)).toBe(false)
  })
  it('usageText', () => {
    expect(usageText({ assets: 3, loans: 2 })).toBe('3 aset dan 2 peminjaman')
    expect(usageText({ assets: 3, loans: 0 })).toBe('3 aset')
    expect(usageText({ assets: 0, loans: 2 })).toBe('2 peminjaman')
  })
})
