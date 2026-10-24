import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePortfolio } from '@/hooks/useWealth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { computeValuation, isArchived, summarize } from '@/lib/wealth/calc'
import { ASSET_CLASSES, CLASS_LABEL, CURRENCIES, type AssetClass } from '@/types/wealth'
import CategoryChips from '@/components/wealth/CategoryChips'
import SummaryCards from '@/components/wealth/SummaryCards'
import { PortfolioCards, PortfolioTable, type PortfolioRow } from '@/components/wealth/PortfolioTable'
import { PrivacyToggle } from '@/components/ui/Money'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'

const PAGE_SIZE = 20
type SortKey = 'value_desc' | 'value_asc' | 'name' | 'newest' | 'gain'
const SORTS: Record<SortKey, string> = {
  value_desc: 'Nilai tertinggi',
  value_asc: 'Nilai terendah',
  name: 'Nama A-Z',
  newest: 'Terbaru ditambahkan',
  gain: 'Performa terbaik',
}

/** Urutkan; nilai kosong selalu di bawah. */
function compare(sort: SortKey) {
  const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : (a - b) * dir)
  return (x: PortfolioRow, y: PortfolioRow): number => {
    switch (sort) {
      case 'value_asc': return nullsLast(x.v.valueIdr, y.v.valueIdr, 1)
      case 'name': return x.a.name.localeCompare(y.a.name, 'id')
      case 'newest': return Date.parse(y.a.created_at) - Date.parse(x.a.created_at)
      case 'gain': return nullsLast(x.v.gainPct, y.v.gainPct, -1)
      default: return nullsLast(x.v.valueIdr, y.v.valueIdr, -1)
    }
  }
}

export default function AssetsPage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const portfolio = usePortfolio()

  const cls = (ASSET_CLASSES as readonly string[]).includes(params.get('cls') ?? '') ? (params.get('cls') as AssetClass) : ''
  const inst = params.get('inst') ?? ''
  const cur = params.get('cur') ?? ''
  const archived = params.get('status') === 'archived'
  const sortParam = params.get('sort') as SortKey | null
  const sort: SortKey = sortParam && sortParam in SORTS ? sortParam : 'value_desc'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const [searchInput, setSearchInput] = useState(q)
  const debounced = useDebouncedValue(searchInput, 300)
  useEffect(() => {
    if (debounced !== q) update('q', debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const rows: PortfolioRow[] = useMemo(() => (portfolio.data ?? []).map((a) => ({ a, v: computeValuation(a) })), [portfolio.data])
  const summary = useMemo(() => summarize(portfolio.data ?? []), [portfolio.data])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of rows) if (!isArchived(r.a.status)) c[r.a.asset_class] = (c[r.a.asset_class] ?? 0) + 1
    return c
  }, [rows])
  const activeTotal = rows.filter((r) => !isArchived(r.a.status)).length

  const institutions = useMemo(() => [...new Set(rows.map((r) => r.a.institution).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'id')), [rows])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows
      .filter((r) => isArchived(r.a.status) === archived)
      .filter((r) => !cls || r.a.asset_class === cls)
      .filter((r) => !inst || r.a.institution === inst)
      .filter((r) => !cur || r.a.currency === cur)
      .filter((r) => {
        if (!term) return true
        const hay = [r.a.name, r.a.symbol, r.a.institution, r.a.asset_code, r.a.serial_number, r.a.account_last4, r.a.category?.name, CLASS_LABEL[r.a.asset_class]]
          .filter(Boolean).join(' ').toLowerCase()
        return hay.includes(term)
      })
      .sort(compare(sort))
  }, [rows, q, cls, inst, cur, archived, sort])

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeFilters = [inst, cur, archived ? '1' : ''].filter(Boolean).length
  const hasAny = activeFilters > 0 || !!q || !!cls
  const reset = () => { setSearchInput(''); setParams({}, { replace: true }) }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Aset Saya</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Kelola seluruh aset dan portofolio kekayaan Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          <PrivacyToggle />
          {profile && <Link to="/assets/new" className="btn-primary"><Plus size={18} /> Tambah Aset</Link>}
        </div>
      </div>

      <SummaryCards summary={summary} loading={portfolio.isLoading} />

      <CategoryChips value={cls} counts={counts} total={activeTotal} onChange={(v) => update('cls', v)} />

      <div className="card space-y-3 p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input type="search" className="input !pl-10" placeholder="Cari nama, kode saham, bank, atau nomor aset" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Cari aset" />
          </div>
          <button className="btn-secondary relative lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-label="Tampilkan filter" aria-expanded={showFilters}>
            <SlidersHorizontal size={18} />
            {activeFilters > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[11px] text-white">{activeFilters}</span>}
          </button>
        </div>
        <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2 lg:grid lg:grid-cols-4`}>
          <select className="input" value={inst} onChange={(e) => update('inst', e.target.value)} aria-label="Filter institusi">
            <option value="">Semua institusi</option>
            {institutions.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <select className="input" value={cur} onChange={(e) => update('cur', e.target.value)} aria-label="Filter mata uang">
            <option value="">Semua mata uang</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={archived ? 'archived' : ''} onChange={(e) => update('status', e.target.value)} aria-label="Filter status">
            <option value="">Aktif</option>
            <option value="archived">Diarsipkan</option>
          </select>
          <select className="input" value={sort} onChange={(e) => update('sort', e.target.value === 'value_desc' ? '' : e.target.value)} aria-label="Urutkan">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Urut: {v}</option>)}
          </select>
        </div>
        {hasAny && (
          <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300"><X size={14} /> Hapus semua filter</button>
        )}
      </div>

      {portfolio.isError ? (
        <ErrorMessage message="Daftar aset gagal dimuat. Periksa koneksi internet Anda." onRetry={() => portfolio.refetch()} />
      ) : portfolio.isLoading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={hasAny ? 'Aset tidak ditemukan' : archived ? 'Belum ada aset yang diarsipkan' : 'Belum ada aset'}
          description={hasAny ? 'Coba ubah kata kunci atau hapus filter.' : 'Catat rekening, saham, emas, properti, atau barang berharga pertama Anda.'}
          action={hasAny ? <button className="btn-secondary" onClick={reset}>Hapus filter</button> : <Link to="/assets/new" className="btn-primary"><Plus size={18} /> Tambah Aset</Link>}
        />
      ) : (
        <div className={portfolio.isFetching ? 'opacity-70 transition-opacity' : ''}>
          <PortfolioCards rows={pageRows} />
          <PortfolioTable rows={pageRows} cls={cls} />
          <div className="mt-4"><Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={(p) => update('page', p === 1 ? '' : String(p))} /></div>
        </div>
      )}
    </div>
  )
}
