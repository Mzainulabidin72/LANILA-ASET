interface Props<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

export default function SegmentedTabs<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-200/70 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[44px] flex-1 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition ${
            value === o.value ? 'bg-white text-brand-800 shadow dark:bg-slate-900 dark:text-brand-200' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
