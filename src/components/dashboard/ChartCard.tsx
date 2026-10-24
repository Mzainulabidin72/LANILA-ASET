import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ChartCard({ title, loading, empty, children }: { title: string; loading?: boolean; empty?: boolean; children: ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-slate-600 dark:text-slate-400">Belum ada data</p>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </section>
  )
}
