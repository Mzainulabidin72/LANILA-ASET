import { useQuery } from '@tanstack/react-query'
import { getPhotoObjectUrl } from '@/lib/storage'

/** Foto diambil dari cache lokal bila ada (jalan offline), jika tidak diunduh lalu disimpan. */
export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['photo-url', path],
    queryFn: () => getPhotoObjectUrl(path as string),
    enabled: !!path,
    staleTime: Infinity,
  })
}
