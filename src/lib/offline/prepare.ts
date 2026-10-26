import type { QueryClient } from '@tanstack/react-query'
import { fetchAssetDetail, fetchCategoryOptions, fetchEmployeeOptions, fetchLocationOptions } from '@/hooks/useAssets'
import { fetchLoansList } from '@/hooks/useLoans'
import { fetchMaintenanceList } from '@/hooks/useMaintenance'
import { fetchPortfolio } from '@/hooks/useWealth'
import { getPhotoObjectUrl } from '@/lib/storage'

export const PREPARED_KEY = 'lanila-prepared-at'
const MAX_DETAILS = 100

async function pool<T>(list: T[], size: number, fn: (x: T) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: Math.min(size, list.length) }, async () => {
    while (i < list.length) {
      const item = list[i++]
      try { await fn(item) } catch { /* satu item gagal tidak menghentikan yang lain */ }
    }
  })
  await Promise.all(workers)
}

/**
 * "Siapkan data offline": ambil seluruh portofolio + detail 100 aset pertama + fotonya selagi online.
 * Permintaan lewat service worker (NetworkFirst) sehingga bisa dibuka lagi saat offline.
 */
export async function prepareOffline(qc: QueryClient, onProgress: (done: number, total: number) => void) {
  const common = { staleTime: 0 }
  await Promise.all([
    qc.fetchQuery({ queryKey: ['lookups', 'categories'], queryFn: fetchCategoryOptions, ...common }),
    qc.fetchQuery({ queryKey: ['lookups', 'locations'], queryFn: fetchLocationOptions, ...common }),
    qc.fetchQuery({ queryKey: ['lookups', 'employees'], queryFn: fetchEmployeeOptions, ...common }),
    qc.fetchQuery({ queryKey: ['loans', 'list', 'active', 1, { q: '', from: '', to: '', sort: 'newest' }], queryFn: () => fetchLoansList('active', 1), ...common }).catch(() => null),
    qc.fetchQuery({ queryKey: ['maintenance', 'list', 'upcoming', 1, { q: '', from: '', to: '', sort: 'auto' }], queryFn: () => fetchMaintenanceList('upcoming', 1), ...common }).catch(() => null),
  ])

  const assets = await qc.fetchQuery({ queryKey: ['assets', 'portfolio'], queryFn: fetchPortfolio, ...common })
  const details = assets.slice(0, MAX_DETAILS)
  const photos = details.filter((a) => a.photo_path)
  const total = details.length + photos.length
  let done = 0
  const tick = () => onProgress(++done, total)
  onProgress(0, total)

  await pool(details, 5, async (a) => {
    await qc.fetchQuery({ queryKey: ['assets', 'detail', a.id], queryFn: () => fetchAssetDetail(a.id), ...common })
    tick()
  })
  await pool(photos, 4, async (a) => {
    await getPhotoObjectUrl(a.photo_path as string)
    tick()
  })

  try { localStorage.setItem(PREPARED_KEY, String(Date.now())) } catch { /* abaikan */ }
  return { assets: assets.length, photos: photos.length }
}
