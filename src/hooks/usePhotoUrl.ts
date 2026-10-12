import { useQuery } from '@tanstack/react-query'
import { getSignedPhotoUrl } from '@/lib/storage'

/** Bucket foto bersifat private, jadi URL-nya "bertanda tangan" dan berlaku 1 jam. */
export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['photo-url', path],
    queryFn: () => getSignedPhotoUrl(path as string),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  })
}
