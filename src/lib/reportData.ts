// Logika laporan yang MURNI (tanpa Supabase/xlsx/jsPDF): pengelompokan, subtotal, nama berkas, periode, halaman pratinjau.
// Dipakai bersama oleh pratinjau di layar dan ekspor Excel/PDF supaya angkanya selalu sama.
import type { AssetCondition, AssetStatus } from '../types/database.ts'
import { CONDITION_LABEL } from '../types/database.ts'

export type ReportKind = 'assets' | 'by_location' | 'by_condition' | 'loans'
export type AssetReportKind = Exclude<ReportKind, 'loans'>
export type ExportFormat = 'xlsx' | 'pdf'

export const REPORT_LABEL: Record<ReportKind, string> = {
  assets: 'Daftar Aset',
  by_location: 'Aset per Lokasi',
  by_condition: 'Aset per Kondisi',
  loans: 'Riwayat Peminjaman',
}

export interface ReportAsset {
  asset_code: string
  name: string
  category: string
  brand: string
  model: string
  serial_number: string
  acquisition_date: string | null
  acquisition_price: number
  location: string
  employee: string
  condition: AssetCondition
  status: AssetStatus
}

export interface ReportLoan {
  asset_code: string
  asset_name: string
  employee: string
  loan_date: string
  due_date: string | null
  return_date: string | null
  /** Dipinjam | Terlambat | Dikembalikan (aturan di lib/loans.ts) */
  state: string
  condition_out: string
  condition_in: string
  notes: string
}

const SLUG: Record<ReportKind, string> = {
  assets: 'daftar-aset',
  by_location: 'aset-per-lokasi',
  by_condition: 'aset-per-kondisi',
  loans: 'riwayat-peminjaman',
}

const p2 = (n: number) => String(n).padStart(2, '0')
export const dateStamp = (d: Date): string => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

/** mis. lanila-aset-daftar-aset-2026-10-27.xlsx */
export function reportFileName(kind: ReportKind, ext: ExportFormat, now: Date = new Date()): string {
  return `lanila-aset-${SLUG[kind]}-${dateStamp(now)}.${ext}`
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100
export const sumPrice = (rows: ReportAsset[]): number => round2(rows.reduce((s, r) => s + r.acquisition_price, 0))

export const CONDITION_ORDER: AssetCondition[] = ['baik', 'rusak_ringan', 'rusak_berat', 'hilang']
export const NO_LOCATION = 'Tanpa lokasi'

export interface AssetGroup {
  key: string
  label: string
  rows: ReportAsset[]
  count: number
  /** total harga perolehan kelompok */
  total: number
  /** persentase dari seluruh aset yang cocok (0-100) */
  pct: number
}

/** Kelompokkan aset. Lokasi: A-Z, "Tanpa lokasi" terakhir. Kondisi: urutan tetap Baik -> Hilang. Kelompok kosong dihilangkan. */
export function groupAssets(rows: ReportAsset[], kind: 'by_location' | 'by_condition'): AssetGroup[] {
  const map = new Map<string, ReportAsset[]>()
  for (const r of rows) {
    const key = kind === 'by_location' ? r.location || NO_LOCATION : r.condition
    const list = map.get(key)
    if (list) list.push(r)
    else map.set(key, [r])
  }
  const keys =
    kind === 'by_condition'
      ? CONDITION_ORDER.filter((c) => map.has(c))
      : [...map.keys()].sort((a, b) => (a === NO_LOCATION ? 1 : b === NO_LOCATION ? -1 : a.localeCompare(b, 'id')))
  return keys.map((key) => {
    const list = map.get(key) as ReportAsset[]
    return {
      key,
      label: kind === 'by_condition' ? CONDITION_LABEL[key as AssetCondition] : key,
      rows: list,
      count: list.length,
      total: sumPrice(list),
      pct: rows.length ? (list.length / rows.length) * 100 : 0,
    }
  })
}

const dmy = (iso: string) => iso.split('-').reverse().join('/')

/** Teks periode tanggal pinjam; kosong jika tidak ada batas. */
export function periodText(from: string, to: string): string {
  if (from && to) return `${dmy(from)} s.d. ${dmy(to)}`
  if (from) return `mulai ${dmy(from)}`
  if (to) return `sampai ${dmy(to)}`
  return 'Semua periode'
}

export interface PageSlice<T> { items: T[]; from: number; to: number; total: number; pages: number; page: number }

/** Potong data untuk satu halaman pratinjau. Halaman di luar jangkauan dirapikan. */
export function pageSlice<T>(rows: T[], page: number, size: number): PageSlice<T> {
  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / size))
  const p = Math.min(Math.max(1, page || 1), pages)
  const start = (p - 1) * size
  const items = rows.slice(start, start + size)
  return { items, from: total === 0 ? 0 : start + 1, to: start + items.length, total, pages, page: p }
}

// ---------------------------------------------------------------- baris Excel berkelompok

/** null = sel benar-benar kosong (judul grup bisa meluap ke kolom sebelah di Excel). */
export type Cell = string | number | null

interface GroupedRowsOptions {
  /** "Lokasi" atau "Kondisi" */
  groupLabel: string
  /** jumlah kolom tabel (termasuk kolom No) */
  columns: number
  /** indeks kolom harga perolehan */
  moneyIdx: number
  /** membuat satu baris aset; n = nomor urut berjalan di seluruh laporan */
  rowOf: (r: ReportAsset, n: number) => Cell[]
}

/**
 * Susun baris tabel Excel untuk laporan berkelompok:
 *   JUDUL GRUP (n aset) -> baris aset -> Subtotal -> baris kosong ... -> TOTAL
 * Nomor urut berlanjut antar grup. Subtotal & total berupa angka (bisa dijumlah di Excel).
 */
export function buildGroupedRows(groups: AssetGroup[], o: GroupedRowsOptions): Cell[][] {
  const blank = (): Cell[] => Array.from({ length: o.columns }, () => null)
  const out: Cell[][] = []
  let n = 0
  let count = 0
  const all: ReportAsset[] = []
  for (const g of groups) {
    const head = blank()
    head[1] = `${o.groupLabel.toUpperCase()}: ${g.label} (${g.count} aset)`
    out.push(head)
    for (const r of g.rows) { out.push(o.rowOf(r, ++n)); all.push(r) }
    const sub = blank()
    sub[2] = `Subtotal ${g.label} (${g.count} aset)`
    sub[o.moneyIdx] = g.total
    out.push(sub, blank())
    count += g.count
  }
  const total = blank()
  total[2] = `TOTAL (${count} aset)`
  total[o.moneyIdx] = sumPrice(all)
  out.push(total)
  return out
}
