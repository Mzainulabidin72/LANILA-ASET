import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props { page: number; pageSize: number; total: number; onChange: (page: number) => void }

export default function Pagination({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {from}–{to} dari {total}
      </p>
      <div className="flex items-center gap-2">
        <button className="btn-secondary !px-3" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[64px] text-center text-sm font-medium">{page} / {pages}</span>
        <button className="btn-secondary !px-3" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Halaman berikutnya">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
