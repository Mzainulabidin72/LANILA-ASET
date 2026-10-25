import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import { buildSearchClause, cleanSearch, type LoanTab } from '@/lib/loans'
import { uuidv4 } from '@/lib/utils'
import { useOffline } from '@/contexts/OfflineContext'
import type { LoanCreatePayload, LoanReturnPayload } from '@/lib/offline/ops'
import type { Loan, AssetCondition } from '@/types/database'

export type { LoanTab } from '@/lib/loans'

export interface LoanWithRefs extends Loan {
  asset: { asset_code: string; name: string } | null
  employee: { full_name: string; position: string | null; phone: string | null } | null
}

const SELECT = '*, asset:aset_assets(asset_code, name), employee:aset_employees(full_name, position, phone)'
export const LOAN_PAGE_SIZE = 15

export type LoanSort = 'newest' | 'oldest' | 'due_soon'
export interface LoanFilters { q: string; from: string; to: string; sort: LoanSort }
export const NO_LOAN_FILTERS: LoanFilters = { q: '', from: '', to: '', sort: 'newest' }

export interface LoanCounts { onLoan: number; overdue: number; returned: number; total: number }
interface SearchIds { assetIds: string[]; employeeIds: string[] }

// ---------------------------------------------------------------- query builder (cermin dari lib/loans.ts)

const base = () => supabase.from('aset_loans').select(SELECT, { count: 'exact' })
type Q = ReturnType<typeof base>

function applyFilters(q: Q, tab: LoanTab, f: LoanFilters, ids: SearchIds | null, today: string): Q {
  let r = q
  if (tab === 'active') r = r.is('return_date', null).or(`due_date.is.null,due_date.gte.${today}`)
  else if (tab === 'overdue') r = r.is('return_date', null).lt('due_date', today)
  else if (tab === 'returned') r = r.not('return_date', 'is', null)
  if (f.from) r = r.gte('loan_date', f.from)
  if (f.to) r = r.lte('loan_date', f.to)
  if (ids) {
    const clause = buildSearchClause(ids.assetIds, ids.employeeIds)
    if (clause) r = r.or(clause)
  }
  return r
}

const noMatch = (term: string, ids: SearchIds | null) => !!term && (!ids || (ids.assetIds.length === 0 && ids.employeeIds.length === 0))

/** Cari id aset (nama/kode) dan peminjam (nama) yang cocok. Satu kali per kata kunci, dipakai bersama daftar & hitungan. */
async function resolveSearch(term: string): Promise<SearchIds> {
  const [a, e] = await Promise.all([
    supabase.from('aset_assets').select('id').or(`name.ilike.%${term}%,asset_code.ilike.%${term}%`).limit(200),
    supabase.from('aset_employees').select('id').ilike('full_name', `%${term}%`).limit(200),
  ])
  if (a.error) throw a.error
  if (e.error) throw e.error
  return {
    assetIds: (a.data ?? []).map((x) => x.id as string),
    employeeIds: (e.data ?? []).map((x) => x.id as string),
  }
}

export async function fetchLoansList(tab: LoanTab, page: number, f: LoanFilters = NO_LOAN_FILTERS, ids: SearchIds | null = null) {
  const term = cleanSearch(f.q)
  if (noMatch(term, ids)) return { items: [] as LoanWithRefs[], total: 0 }
  let q = applyFilters(base(), tab, f, term ? ids : null, todayISO())
  if (f.sort === 'due_soon') q = q.order('due_date', { ascending: true, nullsFirst: false }).order('loan_date', { ascending: false })
  else q = q.order('loan_date', { ascending: f.sort === 'oldest' }).order('created_at', { ascending: f.sort === 'oldest' })
  const from = (page - 1) * LOAN_PAGE_SIZE
  const { data, count, error } = await q.range(from, from + LOAN_PAGE_SIZE - 1)
  if (error) throw error
  return { items: (data ?? []) as unknown as LoanWithRefs[], total: count ?? 0 }
}

/** Tiga hitungan (head, tanpa mengunduh baris). "Total" = jumlah ketiganya: status saling lepas dan lengkap. */
export async function fetchLoanCounts(f: LoanFilters, ids: SearchIds | null): Promise<LoanCounts> {
  const term = cleanSearch(f.q)
  if (noMatch(term, ids)) return { onLoan: 0, overdue: 0, returned: 0, total: 0 }
  const today = todayISO()
  const count = async (tab: LoanTab) => {
    const { count: c, error } = await applyFilters(supabase.from('aset_loans').select(SELECT, { count: 'exact', head: true }), tab, f, term ? ids : null, today)
    if (error) throw error
    return c ?? 0
  }
  const [onLoan, overdue, returned] = await Promise.all([count('active'), count('overdue'), count('returned')])
  return { onLoan, overdue, returned, total: onLoan + overdue + returned }
}

// ---------------------------------------------------------------- hooks

function useSearch(q: string) {
  const term = cleanSearch(q)
  const query = useQuery({ queryKey: ['loans', 'search', term], enabled: term !== '', staleTime: 60_000, queryFn: () => resolveSearch(term) })
  return { term, query, ready: term === '' || query.isSuccess }
}

export function useLoansList(tab: LoanTab, page: number, f: LoanFilters) {
  const s = useSearch(f.q)
  const filters = { ...f, q: s.term }
  const query = useQuery({
    queryKey: ['loans', 'list', tab, page, filters],
    enabled: s.ready,
    placeholderData: keepPreviousData,
    queryFn: () => fetchLoansList(tab, page, filters, s.query.data ?? null),
  })
  return { ...query, isError: query.isError || s.query.isError, refetch: () => { void s.query.refetch(); return query.refetch() } }
}

/** Hitungan untuk kartu ringkasan dan badge tab. Mengikuti pencarian & rentang tanggal yang aktif. */
export function useLoanCounts(f: LoanFilters) {
  const s = useSearch(f.q)
  const filters = { ...f, q: s.term }
  return useQuery({
    queryKey: ['loans', 'counts', { q: filters.q, from: filters.from, to: filters.to }],
    enabled: s.ready,
    placeholderData: keepPreviousData,
    queryFn: () => fetchLoanCounts(filters, s.query.data ?? null),
  })
}

export function useAssetLoans(assetId: string | undefined) {
  return useQuery({
    queryKey: ['loans', 'asset', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aset_loans')
        .select(SELECT)
        .eq('asset_id', assetId as string)
        .order('loan_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as unknown as LoanWithRefs[]
    },
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['loans'] }) // daftar + hitungan + pencarian
  qc.invalidateQueries({ queryKey: ['assets'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
}

interface CreateLoanInput {
  asset_id: string
  employee_id: string
  loan_date: string
  due_date: string | null
  condition_out: AssetCondition
  notes: string | null
  created_by?: string
  /** untuk label di antrean offline */
  assetName?: string
}

/** Status aset otomatis berubah jadi "Dipinjam" lewat trigger database. */
export function useCreateLoan() {
  const qc = useQueryClient()
  const { submit } = useOffline()
  return useMutation({
    mutationFn: async ({ assetName, created_by, ...rest }: CreateLoanInput) => {
      const payload: LoanCreatePayload = { id: uuidv4(), ...rest, created_by: created_by ?? null }
      return submit({ type: 'loan.create', label: `Pinjamkan aset${assetName ? `: ${assetName}` : ''}`, payload })
    },
    onSuccess: () => invalidateAll(qc),
  })
}

interface ReturnLoanInput {
  id: string
  return_date: string
  condition_in: AssetCondition
  notes: string | null
  assetName?: string
}

/** Status aset otomatis kembali "Aktif" dan kondisinya diperbarui lewat trigger database. */
export function useReturnLoan() {
  const qc = useQueryClient()
  const { submit } = useOffline()
  return useMutation({
    mutationFn: async ({ assetName, ...rest }: ReturnLoanInput) => {
      const payload: LoanReturnPayload = rest
      return submit({ type: 'loan.return', label: `Kembalikan aset${assetName ? `: ${assetName}` : ''}`, payload })
    },
    onSuccess: () => invalidateAll(qc),
  })
}
