interface Props { size?: number; withText?: boolean; className?: string }

/** Logo Lanila (tanda daun-L) dengan gradien teal khas produk "Asset". */
export default function Logo({ size = 36, withText = true, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
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
      {withText && (
        <span className="leading-none">
          <span className="block text-lg font-extrabold tracking-tight text-ink dark:text-white">Lanila</span>
          <span className="block text-xs font-semibold tracking-wide text-brand-700 dark:text-brand-300">Aset</span>
        </span>
      )}
    </span>
  )
}
