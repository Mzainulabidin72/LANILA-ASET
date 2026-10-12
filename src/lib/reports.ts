import { supabase } from './supabase'
import { formatDate, formatDateTime, formatRupiah } from './format'
import { todayISO } from './dates'
import { CONDITION_LABEL, STATUS_LABEL, type AssetCondition, type AssetStatus } from '@/types/database'

export type ReportKind = 'assets' | 'by_location' | 'by_condition' | 'loans'
export const REPORT_LABEL: Record<ReportKind, string> = {
  assets: 'Daftar Aset',
  by_location: 'Aset per Lokasi',
  by_condition: 'Aset per Kondisi',
  loans: 'Riwayat Peminjaman',
}
export type ExportFormat = 'xlsx' | 'pdf'

export interface AssetReportFilters { category: string; location: string; condition: string; status: string }
export interface LoanReportFilters { from: string; to: string; state: '' | 'active' | 'overdue' | 'returned' }

// ---------------------------------------------------------------- data

interface ReportAsset {
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

interface RawAsset {
  asset_code: string
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  acquisition_date: string | null
  acquisition_price: number | string | null
  condition: AssetCondition
  status: AssetStatus
  category: { name: string } | null
  location: { name: string } | null
  employee: { full_name: string } | null
}

const PAGE = 1000

async function fetchAssets(f: AssetReportFilters): Promise<ReportAsset[]> {
  const out: ReportAsset[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('aset_assets')
      .select('asset_code, name, brand, model, serial_number, acquisition_date, acquisition_price, condition, status, category:aset_categories(name), location:aset_locations(name), employee:aset_employees(full_name)')
    q = f.status ? q.eq('status', f.status) : q.neq('status', 'dihapus')
    if (f.category) q = q.eq('category_id', f.category)
    if (f.location) q = q.eq('location_id', f.location)
    if (f.condition) q = q.eq('condition', f.condition)
    const { data, error } = await q.order('asset_code').range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as RawAsset[]
    for (const r of rows) {
      out.push({
        asset_code: r.asset_code,
        name: r.name,
        category: r.category?.name ?? '',
        brand: r.brand ?? '',
        model: r.model ?? '',
        serial_number: r.serial_number ?? '',
        acquisition_date: r.acquisition_date,
        acquisition_price: Number(r.acquisition_price ?? 0),
        location: r.location?.name ?? '',
        employee: r.employee?.full_name ?? '',
        condition: r.condition,
        status: r.status,
      })
    }
    if (rows.length < PAGE) break
  }
  return out
}

interface ReportLoan {
  asset_code: string
  asset_name: string
  employee: string
  loan_date: string
  due_date: string | null
  return_date: string | null
  state: string
  condition_out: string
  condition_in: string
  notes: string
}

interface RawLoan {
  loan_date: string
  due_date: string | null
  return_date: string | null
  condition_out: AssetCondition | null
  condition_in: AssetCondition | null
  notes: string | null
  asset: { asset_code: string; name: string } | null
  employee: { full_name: string } | null
}

async function fetchLoans(f: LoanReportFilters): Promise<ReportLoan[]> {
  const today = todayISO()
  const out: ReportLoan[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from('aset_loans').select('loan_date, due_date, return_date, condition_out, condition_in, notes, asset:aset_assets(asset_code, name), employee:aset_employees(full_name)')
    if (f.from) q = q.gte('loan_date', f.from)
    if (f.to) q = q.lte('loan_date', f.to)
    if (f.state === 'active') q = q.is('return_date', null)
    if (f.state === 'overdue') q = q.is('return_date', null).lt('due_date', today)
    if (f.state === 'returned') q = q.not('return_date', 'is', null)
    const { data, error } = await q.order('loan_date', { ascending: false }).order('id').range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as RawLoan[]
    for (const r of rows) {
      const state = r.return_date ? 'Dikembalikan' : r.due_date && r.due_date < today ? 'Terlambat' : 'Dipinjam'
      out.push({
        asset_code: r.asset?.asset_code ?? '',
        asset_name: r.asset?.name ?? '',
        employee: r.employee?.full_name ?? '',
        loan_date: r.loan_date,
        due_date: r.due_date,
        return_date: r.return_date,
        state,
        condition_out: r.condition_out ? CONDITION_LABEL[r.condition_out] : '',
        condition_in: r.condition_in ? CONDITION_LABEL[r.condition_in] : '',
        notes: r.notes ?? '',
      })
    }
    if (rows.length < PAGE) break
  }
  return out
}

// ---------------------------------------------------------------- kolom

interface Col<T> {
  key: string
  header: string
  width: number
  excel: (r: T) => string | number
  pdf: (r: T) => string
  money?: boolean
}

const ASSET_COLS: Col<ReportAsset>[] = [
  { key: 'code', header: 'Kode Aset', width: 16, excel: (r) => r.asset_code, pdf: (r) => r.asset_code },
  { key: 'name', header: 'Nama Aset', width: 30, excel: (r) => r.name, pdf: (r) => r.name },
  { key: 'category', header: 'Kategori', width: 18, excel: (r) => r.category, pdf: (r) => r.category || '-' },
  { key: 'brand', header: 'Merek / Model', width: 22, excel: (r) => [r.brand, r.model].filter(Boolean).join(' '), pdf: (r) => [r.brand, r.model].filter(Boolean).join(' ') || '-' },
  { key: 'serial', header: 'Nomor Seri', width: 18, excel: (r) => r.serial_number, pdf: (r) => r.serial_number || '-' },
  { key: 'location', header: 'Lokasi', width: 20, excel: (r) => r.location, pdf: (r) => r.location || '-' },
  { key: 'employee', header: 'Penanggung Jawab', width: 20, excel: (r) => r.employee, pdf: (r) => r.employee || '-' },
  { key: 'condition', header: 'Kondisi', width: 14, excel: (r) => CONDITION_LABEL[r.condition], pdf: (r) => CONDITION_LABEL[r.condition] },
  { key: 'status', header: 'Status', width: 12, excel: (r) => STATUS_LABEL[r.status], pdf: (r) => STATUS_LABEL[r.status] },
  { key: 'date', header: 'Tgl Perolehan', width: 14, excel: (r) => (r.acquisition_date ? formatDate(r.acquisition_date) : ''), pdf: (r) => (r.acquisition_date ? formatDate(r.acquisition_date) : '-') },
  { key: 'price', header: 'Harga Perolehan (Rp)', width: 20, excel: (r) => r.acquisition_price, pdf: (r) => formatRupiah(r.acquisition_price), money: true },
]

const LOAN_COLS: Col<ReportLoan>[] = [
  { key: 'code', header: 'Kode Aset', width: 16, excel: (r) => r.asset_code, pdf: (r) => r.asset_code },
  { key: 'name', header: 'Nama Aset', width: 28, excel: (r) => r.asset_name, pdf: (r) => r.asset_name },
  { key: 'employee', header: 'Peminjam', width: 22, excel: (r) => r.employee, pdf: (r) => r.employee || '-' },
  { key: 'loan', header: 'Tgl Pinjam', width: 13, excel: (r) => formatDate(r.loan_date), pdf: (r) => formatDate(r.loan_date) },
  { key: 'due', header: 'Jatuh Tempo', width: 13, excel: (r) => (r.due_date ? formatDate(r.due_date) : ''), pdf: (r) => formatDate(r.due_date) },
  { key: 'ret', header: 'Tgl Kembali', width: 13, excel: (r) => (r.return_date ? formatDate(r.return_date) : ''), pdf: (r) => formatDate(r.return_date) },
  { key: 'state', header: 'Status', width: 14, excel: (r) => r.state, pdf: (r) => r.state },
  { key: 'out', header: 'Kondisi Keluar', width: 15, excel: (r) => r.condition_out, pdf: (r) => r.condition_out || '-' },
  { key: 'in', header: 'Kondisi Kembali', width: 15, excel: (r) => r.condition_in, pdf: (r) => r.condition_in || '-' },
  { key: 'notes', header: 'Catatan', width: 30, excel: (r) => r.notes, pdf: (r) => r.notes || '-' },
]

// ---------------------------------------------------------------- pembuat file

interface SheetSpec { name: string; header: string[]; rows: (string | number)[][]; widths: number[]; moneyCols?: number[] }

async function writeExcel(filename: string, sheets: SheetSpec[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.rows])
    ws['!cols'] = s.widths.map((w) => ({ wch: w }))
    for (const c of s.moneyCols ?? []) {
      for (let r = 1; r <= s.rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell) cell.z = '#,##0'
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename)
}

interface PdfSection { heading?: string; head: string[]; body: string[][]; rightCols?: number[] }

async function writePdf(filename: string, title: string, subtitleLines: string[], sections: PdfSection[], footerNote?: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageH = doc.internal.pageSize.getHeight()
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(14, 116, 144)
  doc.text('LANILA ASET', 10, 14)
  doc.setTextColor(15, 23, 42); doc.setFontSize(13)
  doc.text(title, 10, 21)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 116, 139)
  let y = 26
  for (const line of subtitleLines) { doc.text(line, 10, y); y += 4.5 }
  y += 2

  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y

  for (const s of sections) {
    if (s.heading) {
      if (y > pageH - 35) { doc.addPage(); y = 15 }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(15, 23, 42)
      doc.text(s.heading, 10, y)
      y += 2
    }
    const columnStyles: Record<number, { halign: 'right' }> = {}
    for (const c of s.rightCols ?? []) columnStyles[c] = { halign: 'right' }
    autoTable(doc, {
      head: [s.head],
      body: s.body,
      startY: y,
      margin: { left: 10, right: 10, bottom: 14 },
      styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak', textColor: [30, 41, 59] },
      headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles,
    })
    y = lastY() + 8
  }

  if (footerNote) {
    if (y > pageH - 20) { doc.addPage(); y = 15 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42)
    doc.text(footerNote, 10, y)
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184)
    doc.text(`Halaman ${i} dari ${pages}`, pageW - 10, pageH - 6, { align: 'right' })
    doc.text('LANILA ASET', 10, pageH - 6)
  }
  doc.save(filename)
}

const fileName = (slug: string, ext: string) => `LANILA-ASET_${slug}_${todayISO()}.${ext}`
const stamp = () => `Dicetak: ${formatDateTime(new Date())}`

function groupBy<T>(rows: T[], key: (r: T) => string, emptyLabel: string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r) || emptyLabel
    const list = map.get(k)
    if (list) list.push(r); else map.set(k, [r])
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (a === emptyLabel) return 1
    if (b === emptyLabel) return -1
    return a.localeCompare(b, 'id')
  })
}

const sum = (rows: ReportAsset[]) => rows.reduce((s, r) => s + r.acquisition_price, 0)

// ---------------------------------------------------------------- API

/** Mengembalikan jumlah baris. 0 = tidak ada data (file tidak dibuat). */
export async function exportAssetReport(
  kind: Exclude<ReportKind, 'loans'>,
  format: ExportFormat,
  filters: AssetReportFilters,
  filterText: string,
): Promise<number> {
  const rows = await fetchAssets(filters)
  if (rows.length === 0) return 0

  const title = REPORT_LABEL[kind]
  const sub = [stamp(), `Filter: ${filterText || 'Semua data'}`, `Jumlah aset: ${rows.length} | Total nilai: ${formatRupiah(sum(rows))}`]
  const groupKey = kind === 'by_location' ? (r: ReportAsset) => r.location : kind === 'by_condition' ? (r: ReportAsset) => CONDITION_LABEL[r.condition] : null
  const groupLabel = kind === 'by_location' ? 'Lokasi' : 'Kondisi'
  const emptyLabel = 'Tanpa lokasi'

  if (format === 'xlsx') {
    const header = ['No', ...ASSET_COLS.map((c) => c.header)]
    const widths = [5, ...ASSET_COLS.map((c) => c.width)]
    const moneyCols = ASSET_COLS.map((c, i) => (c.money ? i + 1 : -1)).filter((i) => i >= 0)
    const ordered = groupKey ? groupBy(rows, groupKey, emptyLabel).flatMap(([, g]) => g) : rows
    const sheets: SheetSpec[] = [{
      name: title,
      header,
      widths,
      moneyCols,
      rows: ordered.map((r, i) => [i + 1, ...ASSET_COLS.map((c) => c.excel(r))]),
    }]
    if (groupKey) {
      const groups = groupBy(rows, groupKey, emptyLabel)
      sheets.push({
        name: 'Ringkasan',
        header: [groupLabel, 'Jumlah Aset', 'Total Nilai (Rp)'],
        widths: [28, 14, 22],
        moneyCols: [2],
        rows: [...groups.map(([k, g]) => [k, g.length, sum(g)] as (string | number)[]), ['TOTAL', rows.length, sum(rows)]],
      })
    }
    await writeExcel(fileName(kind, 'xlsx'), sheets)
    return rows.length
  }

  // PDF
  const pdfCols = ASSET_COLS.filter((c) => c.key !== 'serial' && !(kind === 'by_location' && c.key === 'location') && !(kind === 'by_condition' && c.key === 'condition'))
  const head = ['No', ...pdfCols.map((c) => c.header.replace(' (Rp)', ''))]
  const rightCols = [pdfCols.findIndex((c) => c.money) + 1]
  const toBody = (list: ReportAsset[]) => list.map((r, i) => [String(i + 1), ...pdfCols.map((c) => c.pdf(r))])

  const sections: PdfSection[] = groupKey
    ? groupBy(rows, groupKey, emptyLabel).map(([k, g]) => ({
        heading: `${groupLabel}: ${k}  -  ${g.length} aset, total ${formatRupiah(sum(g))}`,
        head,
        body: toBody(g),
        rightCols,
      }))
    : [{ head, body: toBody(rows), rightCols }]

  await writePdf(fileName(kind, 'pdf'), title, sub, sections, `Total: ${rows.length} aset  |  Nilai perolehan: ${formatRupiah(sum(rows))}`)
  return rows.length
}

export async function exportLoanReport(format: ExportFormat, filters: LoanReportFilters, filterText: string): Promise<number> {
  const rows = await fetchLoans(filters)
  if (rows.length === 0) return 0
  const title = REPORT_LABEL.loans
  const sub = [stamp(), `Filter: ${filterText || 'Semua data'}`, `Jumlah transaksi: ${rows.length}`]

  if (format === 'xlsx') {
    await writeExcel(fileName('peminjaman', 'xlsx'), [{
      name: title,
      header: ['No', ...LOAN_COLS.map((c) => c.header)],
      widths: [5, ...LOAN_COLS.map((c) => c.width)],
      rows: rows.map((r, i) => [i + 1, ...LOAN_COLS.map((c) => c.excel(r))]),
    }])
    return rows.length
  }

  await writePdf(fileName('peminjaman', 'pdf'), title, sub, [{
    head: ['No', ...LOAN_COLS.map((c) => c.header)],
    body: rows.map((r, i) => [String(i + 1), ...LOAN_COLS.map((c) => c.pdf(r))]),
  }], `Total: ${rows.length} transaksi peminjaman`)
  return rows.length
}
