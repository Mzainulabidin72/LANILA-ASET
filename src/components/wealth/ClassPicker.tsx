import { ASSET_CLASSES, CLASS_HINT, CLASS_LABEL, type AssetClass } from '@/types/wealth'
import { CLASS_ICON } from './classMeta'

/** Langkah 1 menambah aset: pilih jenis aset. Form berikutnya menyesuaikan pilihan ini. */
export default function ClassPicker({ onPick }: { onPick: (c: AssetClass) => void }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Pilih jenis aset</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ASSET_CLASSES.map((c) => {
          const Icon = CLASS_ICON[c]
          return (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              className="card flex min-h-[64px] items-center gap-3 p-4 text-left transition hover:border-brand-600 hover:bg-brand-50/50 motion-reduce:transition-none dark:hover:bg-slate-800"
            >
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon size={22} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{CLASS_LABEL[c]}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-400">{CLASS_HINT[c]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
