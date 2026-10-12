import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { removePhotos, uploadAssetPhoto } from '@/lib/storage'
import { toAssetPayload, type AssetFormValues } from '@/lib/schemas'
import { uuidv4 } from '@/lib/utils'
import type { Asset, AssetStatus, AuditLog } from '@/types/database'

export interface AssetWithRefs extends Asset {
  category: { name: string } | null
  location: { name: string } | null
  employee: { full_name: string } | null
}

const SELECT = '*, category:aset_categories(name), location:aset_locations(name), employee:aset_employees(full_name)'

export const PAGE_SIZE = 10
export type SortKey = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'price_desc' | 'price_asc'
export const SORT_OPTIONS: Record<SortKey, { label: string; column: string; ascending: boolean }> = {
  newest: { label: 'Terbaru', column: 'created_at', ascending: false },
  oldest: { label: 'Terlama', column: 'created_at', ascending: true },
  name_asc: { label: 'Nama A-Z', column: 'name', ascending: true },
  name_desc: { label: 'Nama Z-A', column: 'name', ascending: false },
  price_desc: { label: 'Harga tertinggi', column: 'acquisition_price', ascending: false },
  price_asc: { label: 'Harga terendah', column: 'acquisition_price', ascending: true },
}

export interface AssetFilters {
  search: string
  category: string
  location: string
  condition: string
  status: string
  sort: SortKey
  page: number
}

/** Buang karakter yang bisa merusak sintaks filter PostgREST. */
const sanitize = (s: string) => s.replace(/[%,()*\\]/g, ' ').trim()

export function useAssetsList(f: AssetFilters) {
  return useQuery({
    queryKey: ['assets', 'list', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from('aset_assets').select(SELECT, { count: 'exact' })
      q = f.status ? q.eq('status', f.status) : q.neq('status', 'dihapus')
      if (f.category) q = q.eq('category_id', f.category)
      if (f.location) q = q.eq('location_id', f.location)
      if (f.condition) q = q.eq('condition', f.condition)
      const term = sanitize(f.search)
      if (term) {
        q = q.or(`name.ilike.%${term}%,asset_code.ilike.%${term}%,serial_number.ilike.%${term}%,brand.ilike.%${term}%`)
      }
      const s = SORT_OPTIONS[f.sort]
      const from = (f.page - 1) * PAGE_SIZE
      const { data, count, error } = await q
        .order(s.column, { ascending: s.ascending })
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      return { items: (data ?? []) as unknown as AssetWithRefs[], total: count ?? 0 }
    },
  })
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['assets', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('aset_assets').select(SELECT).eq('id', id as string).maybeSingle()
      if (error) throw error
      return (data as unknown as AssetWithRefs | null) ?? null
    },
  })
}

export function useAssetAudit(assetId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['assets', 'audit', assetId],
    enabled: enabled && !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aset_audit_logs')
        .select('id, asset_id, entity_type, entity_id, action, old_data, new_data, created_at')
        .eq('asset_id', assetId as string)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as AuditLog[]
    },
  })
}

/** Data pilihan untuk dropdown (kategori, lokasi, pegawai). */
export function useLookups() {
  const opts = { staleTime: 5 * 60 * 1000 }
  const categories = useQuery({
    queryKey: ['lookups', 'categories'], ...opts,
    queryFn: async () => {
      const { data, error } = await supabase.from('aset_categories').select('id, name').order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
  })
  const locations = useQuery({
    queryKey: ['lookups', 'locations'], ...opts,
    queryFn: async () => {
      const { data, error } = await supabase.from('aset_locations').select('id, name').order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
  })
  const employees = useQuery({
    queryKey: ['lookups', 'employees'], ...opts,
    queryFn: async () => {
      const { data, error } = await supabase.from('aset_employees').select('id, full_name').eq('is_active', true).order('full_name')
      if (error) throw error
      return (data ?? []) as { id: string; full_name: string }[]
    },
  })
  return { categories: categories.data ?? [], locations: locations.data ?? [], employees: employees.data ?? [], loading: categories.isLoading || locations.isLoading || employees.isLoading }
}

interface SaveInput {
  id?: string
  values: AssetFormValues
  photoFile?: File | null
  removePhoto?: boolean
  oldPhotoPath?: string | null
  userId?: string
}

export function useSaveAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values, photoFile, removePhoto, oldPhotoPath, userId }: SaveInput): Promise<string> => {
      const payload = toAssetPayload(values)
      const assetId = id ?? uuidv4()

      let newPath: string | undefined
      if (photoFile) newPath = await uploadAssetPhoto(assetId, photoFile)
      const photoChange = newPath !== undefined ? { photo_path: newPath } : removePhoto ? { photo_path: null } : {}

      if (id) {
        const { error } = await supabase.from('aset_assets').update({ ...payload, ...photoChange }).eq('id', id)
        if (error) {
          if (newPath) await removePhotos([newPath])
          throw error
        }
        if ((newPath || removePhoto) && oldPhotoPath) await removePhotos([oldPhotoPath])
      } else {
        const { error } = await supabase
          .from('aset_assets')
          .insert({ id: assetId, ...payload, photo_path: newPath ?? null, created_by: userId ?? null })
        if (error) {
          if (newPath) await removePhotos([newPath])
          throw error
        }
      }
      return assetId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/** "Hapus" = ubah status jadi Dihapus (soft delete, riwayat tetap aman). Pulihkan = kembali Aktif. */
export function useSetAssetStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AssetStatus }) => {
      const { error } = await supabase.from('aset_assets').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
