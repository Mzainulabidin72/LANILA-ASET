import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props { icon: LucideIcon; title: string; description?: string; action?: ReactNode }

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 rounded-2xl bg-brand-50 p-4 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={28} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
