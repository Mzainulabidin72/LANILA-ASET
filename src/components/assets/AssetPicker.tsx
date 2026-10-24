import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { AssetCondition } from '@/types/database'

export interface PickAsset {
  id: string
  asset_code: string
  name: string
  condition?: AssetCondition
}

interface Props {
  selected: PickAsset | null
  onSelect: (a: PickAsset | null) => void
  /** true = hanya aset berstatus Aktif (untuk peminjaman) */
  onlyActive?: boolean
  disabled?: boolean
  error?: string
}

/** Cari & pilih aset (tanpa memuat ribuan aset sekaligus). */
export default function AssetPicker({ selected, onSelect, onlyActive, disabled, error }: Props) {
  const [term, setTerm] = useState('')
  const debounced = useDebouncedValue(term.replace(/[%,()*\\]/g, ' ').trim(), 300)

  const { data, isFetching } = useQuery({
    queryKey: ['assets', 'pick', debounced, !!onlyActive],
    enabled: !selected,
    queryFn: async () => {
      let q = supabase.from('aset_assets').select('id, asset_code, name, condition').in('asset_class', ['property', 'vehicle', 'valuable', 'other'])
      q = onlyActive ? q.eq('status', 'aktif') : q.neq('status', 'dihapus')
      if (debounced) q = q.or(`name.ilike.%${debounced}%,asset_code.ilike.%${debounced}%,serial_number.ilike.%${debounced}%`)
      const { data, error: e } = await q.order('name').limit(8)
      if (e) throw e
      return (data ?? []) as PickAsset[]
    },
  })

  if (selected) {
    return (
      <div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{selected.name}</p>
            <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{selected.asset_code}</p>
          </div>
          {!disabled && (
            <button type="button" className="btn-ghost min-w-[44px] !px-0" onClick={() => onSelect(null)} aria-label="Ganti aset">
              <X size={18} />
            </button>
          )}
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
        <input
          className="input !pl-10"
          placeholder="Cari nama atau kode aset"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Cari aset"
        />
      </div>
      <ul className="mt-2 max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        {isFetching && !data ? (
          <li className="p-3 text-sm text-slate-600 dark:text-slate-400">Mencari…</li>
        ) : data && data.length > 0 ? (
          data.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onSelect(a)} className="flex min-h-[48px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{a.asset_code}</span>
                </span>
              </button>
            </li>
          ))
        ) : (
          <li className="p-3 text-sm text-slate-600 dark:text-slate-400">{onlyActive ? 'Tidak ada aset Aktif yang cocok.' : 'Aset tidak ditemukan.'}</li>
        )}
      </ul>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
