import { Construction } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'

export default function ComingSoonPage({ title, stage }: { title: string; stage: number }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <EmptyState
        icon={Construction}
        title="Segera hadir"
        description={`Halaman ini akan dibangun pada Tahap ${stage}.`}
      />
    </div>
  )
}
