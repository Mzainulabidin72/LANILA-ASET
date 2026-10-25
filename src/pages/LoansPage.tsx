import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LOAN_PAGE_SIZE, useLoanCounts, useLoansList, type LoanFilters, type LoanSort, type LoanWithRefs } from '@/hooks/useLoans'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { todayISO } from '@/lib/dates'
import { isValidRange, type LoanTab } from '@/lib/loans'
import LoanDetailModal from '@/components/loans/LoanDetailModal'
import LoanEmpty from '@/components/loans/LoanEmpty'
import LoanFormModal from '@/components/loans/LoanFormModal'
import LoanList from '@/components/loans/LoanList'
import LoanSummaryCards from '@/components/loans/LoanSummaryCards'
import LoanTabs from '@/components/loans/LoanTabs'
import LoanToolbar from '@/components/loans/LoanToolbar'
import ReturnModal from '@/components/loans/ReturnModal'
import Pagination from '@/components/ui/Pagination'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'

const TAB_VALUES: LoanTab[] = ['active', 'overdue', 'returned', 'all']
const SORT_VALUES: LoanSort[] = ['newest', 'oldest', 'due_soon']
const PANEL_ID = 'loan-panel'

export default function LoansPage() {
  const { can } = useAuth()
  const canEdit = can('admin', 'staff')
  const [params, setParams] = useSearchParams()
  const [returning, setReturning] = useState<LoanWithRefs | null>(null)
  const [detail, setDetail] = useState<LoanWithRefs | null>(null)
  const today = todayISO()

  // Seluruh keadaan filter disimpan di URL: bisa di-bookmark, dan tetap ada saat pindah tab.
  const tabParam = params.get('tab') as LoanTab | null
  const tab: LoanTab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : 'active'
  const sortParam = params.get('sort') as LoanSort | null
  const page = Math.max(1, Number(params.get('page')) || 1)
  const raw: LoanFilters = {
    q: params.get('q') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    sort: sortParam && SORT_VALUES.includes(sortParam) ? sortParam : 'newest',
  }
  // Rentang tanggal terbalik tidak dipakai untuk query (peringatan tampil di toolbar)
  const filters: LoanFilters = isValidRange(raw.from, raw.to) ? raw : { ...raw, from: '', to: '' }

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }
  const setTab = (t: LoanTab) => update('tab', t === 'active' ? '' : t)

  const [searchInput, setSearchInput] = useState(raw.q)
  const debounced = useDebouncedValue(searchInput, 350)
  useEffect(() => {
    if (debounced !== raw.q) update('q', debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const list = useLoansList(tab, page, filters)
  const counts = useLoanCounts(filters)
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const filtersActive = !!(raw.q || raw.from || raw.to || raw.sort !== 'newest')
  const dataFilterActive = !!(filters.q || filters.from || filters.to)

  const clearFilters = () => {
    setSearchInput('')
    const next = new URLSearchParams()
    if (tab !== 'active') next.set('tab', tab)
    setParams(next, { replace: true })
  }

  // ?new=<id|1> membuka form peminjaman (dipakai tombol "Pinjamkan" di detail aset)
  const newParam = params.get('new')
  const formOpen = canEdit && newParam !== null
  const openForm = () => update('new', '1', false)
  const closeForm = () => update('new', '', false)

  const startReturn = (l: LoanWithRefs) => { setDetail(null); setReturning(l) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Peminjaman</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Catat dan pantau aset yang sedang dipinjam.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={openForm}><Plus size={18} aria-hidden="true" /> Peminjaman</button>}
      </div>

      <LoanSummaryCards
        counts={counts.data}
        loading={counts.isLoading}
        error={counts.isError}
        onRetry={() => counts.refetch()}
        filtered={dataFilterActive}
        active={tab}
        onPick={setTab}
      />

      <LoanTabs value={tab} counts={counts.data} onChange={setTab} panelId={PANEL_ID} />

      <LoanToolbar
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        filters={raw}
        onChange={(k, v) => update(k, k === 'sort' && v === 'newest' ? '' : v)}
        active={filtersActive}
        onClear={clearFilters}
      />

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`loan-tab-${tab}`} tabIndex={0} className="outline-none">
        {list.isError ? (
          <ErrorMessage message="Data peminjaman gagal dimuat. Periksa koneksi internet Anda." onRetry={() => list.refetch()} />
        ) : list.isLoading || (list.isFetching && !list.data) ? (
          <div className="space-y-3" aria-busy="true" aria-label="Memuat data peminjaman">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <LoanEmpty tab={tab} filtered={dataFilterActive} canCreate={canEdit} onCreate={openForm} onClear={clearFilters} />
        ) : (
          <div className={list.isFetching ? 'opacity-70 transition-opacity motion-reduce:transition-none' : ''}>
            <LoanList items={items} startIndex={(page - 1) * LOAN_PAGE_SIZE} today={today} canEdit={canEdit} onDetail={setDetail} onReturn={startReturn} />
            <div className="mt-4">
              <Pagination page={page} pageSize={LOAN_PAGE_SIZE} total={total} onChange={(p) => update('page', p === 1 ? '' : String(p), false)} />
            </div>
          </div>
        )}
      </div>

      <LoanFormModal open={formOpen} onClose={closeForm} presetAssetId={newParam && newParam !== '1' ? newParam : undefined} />
      <LoanDetailModal loan={detail} today={today} canEdit={canEdit} onClose={() => setDetail(null)} onReturn={startReturn} />
      <ReturnModal loan={returning} onClose={() => setReturning(null)} />
    </div>
  )
}
