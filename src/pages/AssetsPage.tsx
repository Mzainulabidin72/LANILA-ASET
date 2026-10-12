import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Boxes, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PAGE_SIZE, SORT_OPTIONS, useAssetsList, useLookups, type AssetFilters, type SortKey } from '@/hooks/useAssets'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatRupiah } from '@/lib/format'
import { CONDITION_LABEL, STATUS_LABEL } from '@/types/database'
import AssetPhoto from '@/components/assets/AssetPhoto'
import { ConditionBadge, StatusBadge } from '@/components/ui/Badges'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AssetsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { categories, locations } = useLookups()
  const [showFilters, setShowFilters] = useState(false)

  const sortParam = params.get('sort') as SortKey | null
  const filters: AssetFilters = {
    search: params.get('q') ?? '',
    category: params.get('category') ?? '',
    location: params.get('location') ?? '',
    condition: params.get('condition') ?? '',
    status: params.get('status') ?? '',
    sort: sortParam && sortParam in SORT_OPTIONS ? sortParam : 'newest',
    page: Math.max(1, Number(params.get('page')) || 1),
  }

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  // Pencarian: tunggu user berhenti mengetik 0,4 detik
  const [searchInput, setSearchInput] = useState(filters.search)
  const debounced = useDebouncedValue(searchInput, 400)
  useEffect(() => {
    if (debounced !== filters.search) update('q', debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, isLoading, isError, refetch, isFetching } = useAssetsList(filters)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const activeFilterCount = ['category', 'location', 'condition', 'status'].filter((k) => params.get(k)).length
  const hasAnyFilter = activeFilterCount > 0 || !!filters.search

  const resetAll = () => { setSearchInput(''); setParams({}, { replace: true }) }
  const canEdit = can('admin', 'staff')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Aset</h1>
        {canEdit && (
          <Link to="/assets/new" className="btn-primary"><Plus size={18} /> Tambah Aset</Link>
        )}
      </div>

      {/* Cari + filter */}
      <div className="card space-y-3 p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="input !pl-10"
              placeholder="Cari nama, kode, merek, atau nomor seri"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Cari aset"
            />
          </div>
          <button className="btn-secondary relative lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-label="Tampilkan filter">
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[11px] text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2 lg:grid lg:grid-cols-5`}>
          <select className="input" value={filters.category} onChange={(e) => update('category', e.target.value)} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" value={filters.location} onChange={(e) => update('location', e.target.value)} aria-label="Filter lokasi">
            <option value="">Semua lokasi</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="input" value={filters.condition} onChange={(e) => update('condition', e.target.value)} aria-label="Filter kondisi">
            <option value="">Semua kondisi</option>
            {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" value={filters.status} onChange={(e) => update('status', e.target.value)} aria-label="Filter status">
            <option value="">Semua status aktif</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input col-span-2 lg:col-span-1" value={filters.sort} onChange={(e) => update('sort', e.target.value === 'newest' ? '' : e.target.value)} aria-label="Urutkan">
            {Object.entries(SORT_OPTIONS).map(([k, v]) => <option key={k} value={k}>Urut: {v.label}</option>)}
          </select>
        </div>

        {hasAnyFilter && (
          <button onClick={resetAll} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <X size={14} /> Hapus semua filter
          </button>
        )}
      </div>

      {isError ? (
        <ErrorMessage message="Daftar aset gagal dimuat. Periksa koneksi internet Anda." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={hasAnyFilter ? 'Aset tidak ditemukan' : 'Belum ada aset'}
          description={hasAnyFilter ? 'Coba ubah kata kunci atau hapus filter.' : 'Tambahkan aset pertama Anda untuk mulai mengelola inventaris.'}
          action={hasAnyFilter ? <button className="btn-secondary" onClick={resetAll}>Hapus filter</button> : canEdit ? <Link to="/assets/new" className="btn-primary"><Plus size={18} /> Tambah Aset</Link> : undefined}
        />
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
          {/* Kartu (HP) */}
          <ul className="space-y-3 md:hidden">
            {items.map((a) => (
              <li key={a.id}>
                <Link to={`/assets/${a.id}`} className="card flex gap-3 p-3 active:bg-slate-50 dark:active:bg-slate-800">
                  <AssetPhoto path={a.photo_path} alt={a.name} className="h-16 w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-slate-400">{a.asset_code}</p>
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-slate-500">{[a.category?.name, a.location?.name].filter(Boolean).join(' · ') || '-'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <StatusBadge value={a.status} />
                      <ConditionBadge value={a.condition} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabel (laptop) */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="p-3 font-semibold">Aset</th>
                  <th className="p-3 font-semibold">Kategori</th>
                  <th className="p-3 font-semibold">Lokasi</th>
                  <th className="p-3 font-semibold">Kondisi</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 text-right font-semibold">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/assets/${a.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <AssetPhoto path={a.photo_path} alt={a.name} className="h-11 w-11 shrink-0" />
                        <div className="min-w-0">
                          <Link to={`/assets/${a.id}`} className="block truncate font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{a.name}</Link>
                          <p className="font-mono text-xs text-slate-400">{a.asset_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{a.category?.name ?? '-'}</td>
                    <td className="p-3">{a.location?.name ?? '-'}</td>
                    <td className="p-3"><ConditionBadge value={a.condition} /></td>
                    <td className="p-3"><StatusBadge value={a.status} /></td>
                    <td className="p-3 text-right tabular-nums">{formatRupiah(a.acquisition_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination page={filters.page} pageSize={PAGE_SIZE} total={total} onChange={(p) => update('page', p === 1 ? '' : String(p))} />
          </div>
        </div>
      )}
    </div>
  )
}
