import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import { uuidv4 } from '@/lib/utils'
import { useOffline } from '@/contexts/OfflineContext'
import type { LoanCreatePayload, LoanReturnPayload } from '@/lib/offline/ops'
import type { Loan, AssetCondition } from '@/types/database'

export interface LoanWithRefs extends Loan {
  asset: { asset_code: string; name: string } | null
  employee: { full_name: string } | null
}

const SELECT = '*, asset:aset_assets(asset_code, name), employee:aset_employees(full_name)'
export const LOAN_PAGE_SIZE = 10
export type LoanTab = 'active' | 'overdue' | 'returned' | 'all'

export async function fetchLoansList(tab: LoanTab, page: number) {
  let q = supabase.from('aset_loans').select(SELECT, { count: 'exact' })
  if (tab === 'active') q = q.is('return_date', null)
  if (tab === 'overdue') q = q.is('return_date', null).lt('due_date', todayISO())
  if (tab === 'returned') q = q.not('return_date', 'is', null)
  const from = (page - 1) * LOAN_PAGE_SIZE
  const { data, count, error } = await q
    .order('loan_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + LOAN_PAGE_SIZE - 1)
  if (error) throw error
  return { items: (data ?? []) as unknown as LoanWithRefs[], total: count ?? 0 }
}

export function useLoansList(tab: LoanTab, page: number) {
  return useQuery({ queryKey: ['loans', 'list', tab, page], queryFn: () => fetchLoansList(tab, page) })
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
  qc.invalidateQueries({ queryKey: ['loans'] })
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
