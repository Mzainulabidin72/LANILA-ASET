import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type MasterTable = 'aset_categories' | 'aset_locations' | 'aset_employees'
const orderCol = (t: MasterTable) => (t === 'aset_employees' ? 'full_name' : 'name')

export function useMasterList<T = Record<string, unknown>>(table: MasterTable) {
  return useQuery({
    queryKey: ['master', table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order(orderCol(table))
      if (error) throw error
      return (data ?? []) as T[]
    },
  })
}

export function useMasterSave(table: MasterTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      const { error } = id
        ? await supabase.from(table).update(values).eq('id', id)
        : await supabase.from(table).insert(values)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', table] })
      qc.invalidateQueries({ queryKey: ['lookups'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useMasterDelete(table: MasterTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', table] })
      qc.invalidateQueries({ queryKey: ['lookups'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}
