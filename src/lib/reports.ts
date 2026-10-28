import { supabase } from './supabase'
import { formatDate, formatDateTime, formatRupiah } from './format'
import { todayISO } from './dates'
import { loanState } from './loans'
import {
  REPORT_LABEL, buildGroupedRows, groupAssets, periodText, reportFileName, sumPrice,
  type AssetGroup, type AssetReportKind, type Cell, type ExportFormat, type ReportAsset, type ReportLoan,
} from './reportData'
import { CONDITION_LABEL, STATUS_LABEL, type AssetCondition, type AssetStatus } from '@/types/database'
import { PHYSICAL_CLASSES } from '@/types/wealth'

export { REPORT_LABEL }
export type { AssetReportKind, ExportFormat, ReportAsset, ReportLoan, ReportKind } from './reportData'

export interface AssetReportFilters { category: string; location: string; condition: string; status: string }
export interface LoanReportFilters { from: string; to: string; state: '' | 'active' | 'overdue' | 'returned' }

/** Keterangan yang ikut tercetak di Excel/PDF. */
export interface ReportMeta { filterText: string; period?: string; generatedAt?: Date }

// ---------------------------------------------------------------- data (satu sumber untuk pratinjau DAN ekspor)

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

/**
 * Laporan mencakup ASET FISIK/inventaris (properti, kendaraan, barang berharga, lainnya): hanya jenis ini yang punya
 * lokasi dan kondisi. Aset keuangan (rekening, saham, dst.) tidak dimasukkan. RLS tetap membatasi baris yang boleh dilihat.
 */
export async function fetchAssetReportRows(f: AssetReportFilters): Promise<ReportAsset[]> {
  const out: ReportAsset[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('aset_assets')
      .select('asset_code, name, brand, model, serial_number, acquisition_date, acquisition_price, condition, status, category:aset_categories(name), location:aset_locations(name), employee:aset_employees(full_name)')
      .in('asset_class', [...PHYSICAL_CLASSES])
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

const STATE_LABEL = { dipinjam: 'Dipinjam', terlambat: 'Terlambat', dikembalikan: 'Dikembalikan' } as const

export async function fetchLoanReportRows(f: LoanReportFilters): Promise<ReportLoan[]> {
  const today = todayISO()
  const out: ReportLoan[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from('aset_loans').select('loan_date, due_date, return_date, condition_out, condition_in, notes, asset:aset_assets(asset_code, name), employee:aset_employees(full_name)')
    if (f.from) q = q.gte('loan_date', f.from)
    if (f.to) q = q.lte('loan_date', f.to)
    // Aturan status sama dengan halaman Peminjaman (lib/loans.ts): tiga status saling lepas
    if (f.state === 'active') q = q.is('return_date', null).or(`due_date.is.null,due_date.gte.${today}`)
    if (f.state === 'overdue') q = q.is('return_date', null).lt('due_date', today)
    if (f.state === 'returned') q = q.not('return_date', 'is', null)
    const { data, error } = await q.order('loan_date', { ascending: false }).order('id').range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as RawLoan[]
    for (const r of rows) {
      out.push({
        asset_code: r.asset?.asset_code ?? '',
        asset_name: r.asset?.name ?? '',
        employee: r.employee?.full_name ?? '',
        loan_date: r.loan_date,
        due_date: r.due_date,
        return_date: r.return_date,
        state: STATE_LABEL[loanState(r, today)],
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

// ---------------------------------------------------------------- penulis berkas

interface SheetSpec {
  name: string
  /** baris keterangan di atas tabel (judul, tanggal cetak, filter, ...) */
  meta?: Cell[][]
  header: string[]
  rows: Cell[][]
  widths: number[]
  moneyCols?: number[]
  autofilter?: boolean
}

async function writeExcel(filename: string, sheets: SheetSpec[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const meta = s.meta ?? []
    const offset = meta.length ? meta.length + 1 : 0 // baris kosong pemisah setelah keterangan
    const aoa: Cell[][] = [...meta, ...(meta.length ? [[]] : []), s.header, ...s.rows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = s.widths.map((w) => ({ wch: w }))
    if (s.autofilter && s.rows.length > 0) {
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: offset, c: 0 }, e: { r: offset + s.rows.length, c: s.header.length - 1 } }) }
    }
    for (const c of s.moneyCols ?? []) {
      for (let r = offset + 1; r <= offset + s.rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell && cell.t === 'n') cell.z = '#,##0'
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
      showHead: 'everyPage', // judul kolom diulang di tiap halaman
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

const stamp = (d: Date) => `Dicetak: ${formatDateTime(d)}`

function metaRows(title: string, m: ReportMeta, count: number, countLabel: string): Cell[][] {
  const rows: Cell[][] = [
    ['LANILA ASET'],
    [title],
    ['Dicetak', formatDateTime(m.generatedAt ?? new Date())],
    ['Filter', m.filterText || 'Semua data'],
  ]
  if (m.period) rows.push(['Periode', m.period])
  rows.push([countLabel, count])
  return rows
}

const grouped = (k: AssetReportKind): k is 'by_location' | 'by_condition' => k !== 'assets'

// ---------------------------------------------------------------- ekspor (memakai DATA YANG SAMA dengan pratinjau)

/** Mengekspor seluruh data yang cocok dengan filter (bukan hanya halaman pratinjau). */
export async function exportAssetReport(kind: AssetReportKind, format: ExportFormat, rows: ReportAsset[], meta: ReportMeta): Promise<void> {
  if (rows.length === 0) throw new Error('Tidak ada data untuk diekspor.')
  const now = meta.generatedAt ?? new Date()
  const title = REPORT_LABEL[kind]
  const groups: AssetGroup[] | null = grouped(kind) ? groupAssets(rows, kind) : null
  const groupLabel = kind === 'by_location' ? 'Lokasi' : 'Kondisi'
  const totalLine = `Jumlah aset: ${rows.length} | Total harga perolehan: ${formatRupiah(sumPrice(rows))}`

  if (format === 'xlsx') {
    const header = ['No', ...ASSET_COLS.map((c) => c.header)]
    const widths = [5, ...ASSET_COLS.map((c) => c.width)]
    const moneyIdx = ASSET_COLS.findIndex((c) => c.money) + 1
    const moneyCols = [moneyIdx]
    const rowOf = (r: ReportAsset, n: number): Cell[] => [n, ...ASSET_COLS.map((c) => c.excel(r))]

    const data: Cell[][] = groups
      ? buildGroupedRows(groups, { groupLabel, columns: header.length, moneyIdx, rowOf })
      : rows.map((r, i) => rowOf(r, i + 1))

    const sheets: SheetSpec[] = [{
      name: title, meta: metaRows(title, { ...meta, generatedAt: now }, rows.length, 'Jumlah aset'),
      header, rows: data, widths, moneyCols, autofilter: !groups,
    }]
    if (groups) {
      sheets.push({
        name: 'Ringkasan',
        header: [groupLabel, 'Jumlah Aset', 'Persentase (%)', 'Total Harga Perolehan (Rp)'],
        widths: [28, 14, 16, 26],
        moneyCols: [3],
        rows: [
          ...groups.map((g) => [g.label, g.count, Math.round(g.pct * 100) / 100, g.total] as Cell[]),
          ['TOTAL', rows.length, 100, sumPrice(rows)],
        ],
      })
    }
    await writeExcel(reportFileName(kind, 'xlsx', now), sheets)
    return
  }

  // PDF
  const pdfCols = ASSET_COLS.filter((c) => c.key !== 'serial' && !(kind === 'by_location' && c.key === 'location') && !(kind === 'by_condition' && c.key === 'condition'))
  const head = ['No', ...pdfCols.map((c) => c.header.replace(' (Rp)', ''))]
  const rightCols = [pdfCols.findIndex((c) => c.money) + 1]
  const toBody = (list: ReportAsset[]) => list.map((r, i) => [String(i + 1), ...pdfCols.map((c) => c.pdf(r))])
  const sub = [stamp(now), `Filter: ${meta.filterText || 'Semua data'}`, totalLine]

  const sections: PdfSection[] = groups
    ? groups.map((g) => ({
        heading: `${groupLabel}: ${g.label}  -  ${g.count} aset${kind === 'by_condition' ? ` (${g.pct.toFixed(1)}%)` : ''}, subtotal ${formatRupiah(g.total)}`,
        head,
        body: toBody(g.rows),
        rightCols,
      }))
    : [{ head, body: toBody(rows), rightCols }]

  await writePdf(reportFileName(kind, 'pdf', now), title, sub, sections, `Total: ${rows.length} aset  |  Nilai perolehan: ${formatRupiah(sumPrice(rows))}`)
}

export async function exportLoanReport(format: ExportFormat, rows: ReportLoan[], meta: ReportMeta): Promise<void> {
  if (rows.length === 0) throw new Error('Tidak ada data untuk diekspor.')
  const now = meta.generatedAt ?? new Date()
  const title = REPORT_LABEL.loans
  const period = meta.period ?? periodText('', '')

  if (format === 'xlsx') {
    await writeExcel(reportFileName('loans', 'xlsx', now), [{
      name: title,
      meta: metaRows(title, { ...meta, period, generatedAt: now }, rows.length, 'Jumlah transaksi'),
      header: ['No', ...LOAN_COLS.map((c) => c.header)],
      widths: [5, ...LOAN_COLS.map((c) => c.width)],
      rows: rows.map((r, i) => [i + 1, ...LOAN_COLS.map((c) => c.excel(r))]),
      autofilter: true,
    }])
    return
  }

  await writePdf(
    reportFileName('loans', 'pdf', now),
    title,
    [stamp(now), `Periode tanggal pinjam: ${period}`, `Filter: ${meta.filterText || 'Semua data'}`, `Jumlah transaksi: ${rows.length}`],
    [{ head: ['No', ...LOAN_COLS.map((c) => c.header)], body: rows.map((r, i) => [String(i + 1), ...LOAN_COLS.map((c) => c.pdf(r))]) }],
    `Total: ${rows.length} transaksi peminjaman`,
  )
}
