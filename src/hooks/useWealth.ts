import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AssetWithRefs } from '@/hooks/useAssets'
import type { ValuationSource } from '@/types/wealth'

const SELECT = '*, category:aset_categories(name), location:aset_locations(name), employee:aset_employees(full_name)'
const PAGE = 1000

/** Seluruh aset yang boleh dilihat pengguna (RLS memastikan aset pribadi orang lain tidak ikut). */
export async function fetchPortfolio(): Promise<AssetWithRefs[]> {
  const out: AssetWithRefs[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('aset_assets').select(SELECT).order('created_at', { ascending: false }).order('id').range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as AssetWithRefs[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export function usePortfolio() {
  return useQuery({ queryKey: ['assets', 'portfolio'], queryFn: fetchPortfolio })
}

export interface ValuationRow {
  id: string
  asset_id: string
  value: number
  unit_price: number | null
  quantity: number | null
  currency: string
  source: ValuationSource
  note: string | null
  valued_at: string
}

export function useValuations(assetId: string | undefined) {
  return useQuery({
    queryKey: ['valuations', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aset_valuations')
        .select('id, asset_id, value, unit_price, quantity, currency, source, note, valued_at')
        .eq('asset_id', assetId as string)
        .order('valued_at', { ascending: true })
        .limit(500)
      if (error) throw error
      return ((data ?? []) as unknown as ValuationRow[]).map((r) => ({ ...r, value: Number(r.value) }))
    },
  })
}
