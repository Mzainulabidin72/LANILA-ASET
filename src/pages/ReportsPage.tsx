import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileSearch } from 'lucide-react'
import { fetchCategoryOptions, fetchLocationOptions } from '@/hooks/useAssets'
import { errorMessage } from '@/lib/errors'
import { isValidRange } from '@/lib/loans'
import {
  exportAssetReport, exportLoanReport, fetchAssetReportRows, fetchLoanReportRows,
  type AssetReportFilters, type LoanReportFilters,
} from '@/lib/reports'
import { REPORT_LABEL, groupAssets, pageSlice, periodText, type ExportFormat, type ReportKind } from '@/lib/reportData'
import { CONDITION_LABEL, STATUS_LABEL } from '@/types/database'
import ReportFilters, { type LookupState } from '@/components/reports/ReportFilters'
import { AssetPreview, GroupedPreview, LoanPreview } from '@/components/reports/ReportPreviews'
import ReportSummary from '@/components/reports/ReportSummary'
import ReportTypeCards from '@/components/reports/ReportTypeCards'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Pagination from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const KINDS: ReportKind[] = ['assets', 'by_location', 'by_condition', 'loans']
const LOAN_STATES = ['active', 'overdue', 'returned'] as const
const LOAN_STATE_LABEL = { active: 'Sedang dipinjam', overdue: 'Terlambat', returned: 'Sudah dikembalikan' } as const
const PREVIEW_PAGE = 20
const STALE = 30_000

const asLookup = (q: { data: { id: string; name: string }[] | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown }): LookupState => ({
  data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: () => { void q.refetch() },
})

export default function ReportsPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  // Filter disimpan di URL. Laporan aset dan peminjaman memakai filter masing-masing; yang tidak relevan tidak pernah dipakai.
  const kindParam = params.get('kind') as ReportKind | null
  const kind: ReportKind = kindParam && KINDS.includes(kindParam) ? kindParam : 'assets'
  const family = kind === 'loans' ? 'loans' : 'assets'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const condParam = params.get('cond') ?? ''
  const statusParam = params.get('status') ?? ''
  const stateParam = params.get('lstate') ?? ''
  const assetFilters: AssetReportFilters = useMemo(() => ({
    category: params.get('cat') ?? '',
    location: params.get('loc') ?? '',
    condition: condParam in CONDITION_LABEL ? condParam : '',
    status: statusParam in STATUS_LABEL ? statusParam : '',
  }), [params, condParam, statusParam])
  const loanFilters: LoanReportFilters = useMemo(() => ({
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    state: (LOAN_STATES as readonly string[]).includes(stateParam) ? (stateParam as LoanReportFilters['state']) : '',
  }), [params, stateParam])
  const rangeOk = isValidRange(loanFilters.from, loanFilters.to)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    next.delete('page')
    setParams(next, { replace: true })
  }
  const setKind = (k: ReportKind) => update('kind', k === 'assets' ? '' : k)

  // Opsi filter dari server (kunci sama dengan useLookups, jadi tidak diambil dua kali)
  const categories = useQuery({ queryKey: ['lookups', 'categories'], queryFn: fetchCategoryOptions, staleTime: 5 * 60_000 })
  const locations = useQuery({ queryKey: ['lookups', 'locations'], queryFn: fetchLocationOptions, staleTime: 5 * 60_000 })

  // Satu sumber data: dipakai pratinjau DAN ekspor. Tiga laporan aset berbagi satu query (pengelompokan dilakukan di klien).
  const assetsQ = useQuery({ queryKey: ['reports', 'assets', assetFilters], enabled: family === 'assets', staleTime: STALE, queryFn: () => fetchAssetReportRows(assetFilters) })
  const loansQ = useQuery({ queryKey: ['reports', 'loans', loanFilters], enabled: family === 'loans' && rangeOk, staleTime: STALE, queryFn: () => fetchLoanReportRows(loanFilters) })
  const active = family === 'loans' ? loansQ : assetsQ
  const assetRows = assetsQ.data
  const loanRows = loansQ.data
  const rows = family === 'loans' ? loanRows : assetRows
  const total = rows?.length ?? 0

  const groups = useMemo(
    () => (assetRows && (kind === 'by_location' || kind === 'by_condition') ? groupAssets(assetRows, kind) : null),
    [assetRows, kind],
  )

  // Ringkasan filter aktif (chip) dan teks untuk berkas
  const chips: string[] = useMemo(() => {
    if (family === 'loans') {
      const c: string[] = []
      if (loanFilters.from || loanFilters.to) c.push(`Tanggal: ${periodText(loanFilters.from, loanFilters.to)}`)
      if (loanFilters.state) c.push(`Status: ${LOAN_STATE_LABEL[loanFilters.state]}`)
      return c
    }
    const c: string[] = []
    if (assetFilters.category) c.push(`Kategori: ${categories.data?.find((x) => x.id === assetFilters.category)?.name ?? '...'}`)
    if (assetFilters.location) c.push(`Lokasi: ${locations.data?.find((x) => x.id === assetFilters.location)?.name ?? '...'}`)
    if (assetFilters.condition) c.push(`Kondisi: ${CONDITION_LABEL[assetFilters.condition as keyof typeof CONDITION_LABEL]}`)
    if (assetFilters.status) c.push(`Status: ${STATUS_LABEL[assetFilters.status as keyof typeof STATUS_LABEL]}`)
    return c
  }, [family, loanFilters, assetFilters, categories.data, locations.data])

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const k of family === 'loans' ? ['from', 'to', 'lstate'] : ['cat', 'loc', 'cond', 'status']) next.delete(k)
    next.delete('page')
    setParams(next, { replace: true })
  }

  const slice = family === 'loans' ? pageSlice(loanRows ?? [], page, PREVIEW_PAGE) : kind === 'assets' ? pageSlice(assetRows ?? [], page, PREVIEW_PAGE) : null
  const canExport = !active.isLoading && !active.isError && !active.isFetching && total > 0

  const run = async (format: ExportFormat) => {
    if (busy || !canExport) return
    setBusy(format)
    try {
      const meta = { filterText: chips.join(', '), generatedAt: new Date() }
      if (kind === 'loans') {
        await exportLoanReport(format, loanRows ?? [], { ...meta, period: periodText(loanFilters.from, loanFilters.to) })
      } else {
        await exportAssetReport(kind, format, assetRows ?? [], meta)
      }
      toast.success(`Berkas ${format === 'xlsx' ? 'Excel' : 'PDF'} dibuat dengan ${total} data. Periksa folder unduhan Anda.`)
    } catch (e) {
      toast.error(errorMessage(e, 'Berkas gagal dibuat. Coba lagi.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Pilih jenis laporan, atur filter, lalu tinjau dan unduh hasilnya.</p>
      </div>

      <ReportTypeCards value={kind} onChange={setKind} />

      <ReportFilters
        family={family}
        asset={assetFilters}
        loan={loanFilters}
        categories={asLookup(categories)}
        locations={asLookup(locations)}
        onAsset={(k, v) => update({ category: 'cat', location: 'loc', condition: 'cond', status: 'status' }[k], v)}
        onLoan={(k, v) => update(k === 'state' ? 'lstate' : k, v)}
        activeCount={chips.length}
        onClear={clearFilters}
      />

      {family === 'loans' && !rangeOk ? (
        <p className="card p-4 text-sm text-slate-700 dark:text-slate-300">Laporan akan tampil setelah rentang tanggal diperbaiki.</p>
      ) : active.isError ? (
        <ErrorMessage message={`${errorMessage(active.error, 'Data laporan gagal dimuat.')} Berkas tidak dibuat dari data yang tidak lengkap.`} onRetry={() => active.refetch()} />
      ) : active.isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Memuat laporan">
          <Skeleton className="h-28 w-full" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <ReportSummary
            title={REPORT_LABEL[kind]}
            total={total}
            groups={groups?.length}
            shown={slice ? { from: slice.from, to: slice.to } : undefined}
            chips={chips}
            period={kind === 'loans' ? periodText(loanFilters.from, loanFilters.to) : undefined}
            updatedAt={active.dataUpdatedAt}
            canExport={canExport}
            busy={busy}
            refreshing={active.isFetching}
            onExport={run}
            onRefresh={() => active.refetch()}
          />

          {total === 0 ? (
            <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-8 text-center">
              <span className="mb-3 rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><FileSearch size={26} aria-hidden="true" /></span>
              <h2 className="text-base font-semibold">Tidak ada data untuk laporan ini</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">Filter yang dipilih mungkin tidak cocok dengan data apa pun.</p>
              {chips.length > 0 && <button className="btn-secondary mt-4" onClick={clearFilters}>Hapus filter</button>}
            </div>
          ) : (
            <div className={active.isFetching ? 'opacity-70 transition-opacity motion-reduce:transition-none' : ''}>
              {kind === 'assets' && slice && <AssetPreview rows={(slice.items as typeof assetRows) ?? []} />}
              {(kind === 'by_location' || kind === 'by_condition') && groups && <GroupedPreview groups={groups} kind={kind} />}
              {kind === 'loans' && slice && <LoanPreview rows={(slice.items as typeof loanRows) ?? []} startIndex={slice.from - 1} />}
              {slice && slice.pages > 1 && (
                <div className="mt-4">
                  <Pagination page={slice.page} pageSize={PREVIEW_PAGE} total={slice.total} onChange={(p) => { const n = new URLSearchParams(params); if (p === 1) n.delete('page'); else n.set('page', String(p)); setParams(n, { replace: true }) }} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
