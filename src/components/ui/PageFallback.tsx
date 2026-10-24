import { Skeleton } from './Skeleton'

/** Tampil sekilas saat halaman (yang dimuat bertahap/lazy) sedang diambil. */
export default function PageFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat halaman">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
