interface Props {
  size?: number
  withText?: boolean
  className?: string
  /** 'lockup' = versi besar untuk halaman masuk (ikon + nama + label Aset sebagai satu kesatuan) */
  variant?: 'default' | 'lockup'
}

/** Logo Lanila (tanda daun-L) dengan gradien teal khas produk "Asset". */
export default function Logo({ size = 36, withText = true, className = '', variant = 'default' }: Props) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="lanila-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0E7490" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#lanila-g)" />
      <path fill="#fff" d="M196 96c-52 38-76 92-76 166v70c0 52 34 84 84 84h20V170c0-30-8-54-28-74z" />
      <path fill="#fff" fillOpacity=".85" d="M244 336l148-40c-4 76-46 124-120 124h-28z" />
    </svg>
  )

  if (variant === 'lockup') {
    return (
      <span className={`inline-flex items-center gap-3.5 ${className}`}>
        {mark}
        {withText && (
          <span className="leading-none">
            <span className="block text-[1.9rem] font-extrabold tracking-tight text-ink dark:text-white">Lanila</span>
            <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-[0.34em] text-brand-700 dark:text-brand-300">Aset</span>
          </span>
        )}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      {withText && (
        <span className="leading-none">
          <span className="block text-lg font-extrabold tracking-tight text-ink dark:text-white">Lanila</span>
          <span className="block text-xs font-semibold tracking-wide text-brand-700 dark:text-brand-300">Aset</span>
        </span>
      )}
    </span>
  )
}
