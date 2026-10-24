import { CLASS_SHORT, ASSET_CLASSES, type AssetClass } from '@/types/wealth'
import { CLASS_ICON } from './classMeta'

interface Props { value: '' | AssetClass; counts: Record<string, number>; total: number; onChange: (v: '' | AssetClass) => void }

/** Tab kategori yang bisa digeser di layar kecil. */
export default function CategoryChips({ value, counts, total, onChange }: Props) {
  const base = 'inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition motion-reduce:transition-none'
  const on = 'border-brand-700 bg-brand-700 text-white'
  const off = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
  return (
    <div role="tablist" aria-label="Kategori aset" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
      <button role="tab" aria-selected={value === ''} onClick={() => onChange('')} className={`${base} ${value === '' ? on : off}`}>
        Semua Aset <span className="opacity-80">{total}</span>
      </button>
      {ASSET_CLASSES.map((c) => {
        const Icon = CLASS_ICON[c]
        const n = counts[c] ?? 0
        return (
          <button key={c} role="tab" aria-selected={value === c} onClick={() => onChange(c)} className={`${base} ${value === c ? on : off}`}>
            <Icon size={16} aria-hidden="true" /> {CLASS_SHORT[c]} <span className="opacity-80">{n}</span>
          </button>
        )
      })}
    </div>
  )
}
