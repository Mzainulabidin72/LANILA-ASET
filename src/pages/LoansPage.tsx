import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HandCoins, Plus, Undo2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LOAN_PAGE_SIZE, useLoansList, type LoanTab, type LoanWithRefs } from '@/hooks/useLoans'
import { daysBetween, todayISO } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { LoanBadge, loanDisplayStatus } from '@/components/loans/LoanBadge'
import LoanFormModal from '@/components/loans/LoanFormModal'
import ReturnModal from '@/components/loans/ReturnModal'
import SegmentedTabs from '@/components/ui/SegmentedTabs'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'

const TABS: { value: LoanTab; label: string }[] = [
  { value: 'active', label: 'Sedang dipinjam' },
  { value: 'overdue', label: 'Terlambat' },
  { value: 'returned', label: 'Dikembalikan' },
  { value: 'all', label: 'Semua' },
]
const EMPTY_TEXT: Record<LoanTab, string> = {
  active: 'Tidak ada aset yang sedang dipinjam.',
  overdue: 'Tidak ada peminjaman yang terlambat.',
  returned: 'Belum ada riwayat pengembalian.',
  all: 'Belum ada data peminjaman.',
}

export default function LoansPage() {
  const { can } = useAuth()
  const canEdit = can('admin', 'staff')
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<LoanTab>('active')
  const [page, setPage] = useState(1)
  const [returning, setReturning] = useState<LoanWithRefs | null>(null)
  const { data, isLoading, isError, refetch, isFetching } = useLoansList(tab, page)
  const today = todayISO()

  const newParam = params.get('new') // ?new=<assetId> atau ?new=1
  const formOpen = canEdit && newParam !== null
  const closeForm = () => { const n = new URLSearchParams(params); n.delete('new'); setParams(n, { replace: true }) }
  const openForm = () => { const n = new URLSearchParams(params); n.set('new', '1'); setParams(n, { replace: true }) }

  const items = data?.items ?? []
  const lateInfo = (l: LoanWithRefs) => {
    if (l.return_date || !l.due_date || l.due_date >= today) return null
    return `Telat ${daysBetween(l.due_date, today)} hari`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Peminjaman</h1>
        {canEdit && <button className="btn-primary" onClick={openForm}><Plus size={18} /> Pinjamkan</button>}
      </div>

      <SegmentedTabs value={tab} options={TABS} onChange={(v) => { setTab(v); setPage(1) }} />

      {isError ? (
        <ErrorMessage message="Data peminjaman gagal dimuat." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={HandCoins} title="Tidak ada data" description={EMPTY_TEXT[tab]}
          action={canEdit && tab === 'active' ? <button className="btn-primary" onClick={openForm}><Plus size={18} /> Pinjamkan Aset</button> : undefined} />
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
          {/* Kartu (HP) */}
          <ul className="space-y-3 md:hidden">
            {items.map((l) => {
              const st = loanDisplayStatus(l, today)
              return (
                <li key={l.id} className="card space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/assets/${l.asset_id}`} className="block truncate font-semibold hover:underline">{l.asset?.name ?? '-'}</Link>
                      <p className="font-mono text-[11px] text-slate-400">{l.asset?.asset_code}</p>
                    </div>
                    <LoanBadge value={st} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{l.employee?.full_name ?? '-'}</p>
                  <p className="text-xs text-slate-500">
                    Pinjam {formatDate(l.loan_date)} · Jatuh tempo {formatDate(l.due_date)}
                    {l.return_date && ` · Kembali ${formatDate(l.return_date)}`}
                  </p>
                  {lateInfo(l) && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{lateInfo(l)}</p>}
                  {canEdit && !l.return_date && (
                    <button className="btn-secondary w-full" onClick={() => setReturning(l)}><Undo2 size={18} /> Kembalikan</button>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Tabel (laptop) */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="p-3 font-semibold">Aset</th>
                  <th className="p-3 font-semibold">Peminjam</th>
                  <th className="p-3 font-semibold">Tgl pinjam</th>
                  <th className="p-3 font-semibold">Jatuh tempo</th>
                  <th className="p-3 font-semibold">Tgl kembali</th>
                  <th className="p-3 font-semibold">Status</th>
                  {canEdit && <th className="p-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((l) => {
                  const st = loanDisplayStatus(l, today)
                  return (
                    <tr key={l.id}>
                      <td className="p-3">
                        <Link to={`/assets/${l.asset_id}`} className="block font-semibold hover:underline">{l.asset?.name ?? '-'}</Link>
                        <span className="font-mono text-xs text-slate-400">{l.asset?.asset_code}</span>
                      </td>
                      <td className="p-3">{l.employee?.full_name ?? '-'}</td>
                      <td className="p-3">{formatDate(l.loan_date)}</td>
                      <td className="p-3">
                        {formatDate(l.due_date)}
                        {lateInfo(l) && <span className="block text-xs font-semibold text-red-600 dark:text-red-400">{lateInfo(l)}</span>}
                      </td>
                      <td className="p-3">{formatDate(l.return_date)}</td>
                      <td className="p-3"><LoanBadge value={st} /></td>
                      {canEdit && (
                        <td className="p-3 text-right">
                          {!l.return_date && <button className="btn-secondary" onClick={() => setReturning(l)}><Undo2 size={18} /> Kembalikan</button>}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4"><Pagination page={page} pageSize={LOAN_PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} /></div>
        </div>
      )}

      <LoanFormModal open={formOpen} onClose={closeForm} presetAssetId={newParam && newParam !== '1' ? newParam : undefined} />
      <ReturnModal loan={returning} onClose={() => setReturning(null)} />
    </div>
  )
}
