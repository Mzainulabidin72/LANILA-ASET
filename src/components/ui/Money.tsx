import { Eye, EyeOff } from 'lucide-react'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { HIDDEN, formatMoney, formatSignedMoney } from '@/lib/wealth/format'

interface Props { value: number | null | undefined; currency?: string; signed?: boolean; className?: string }

/** Nilai uang yang menghormati pengaturan "sembunyikan nilai". */
export default function Money({ value, currency = 'IDR', signed, className }: Props) {
  const { hidden } = usePrivacy()
  if (value === null || value === undefined) return <span className={className}>-</span>
  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      {hidden ? HIDDEN : signed ? formatSignedMoney(value, currency) : formatMoney(value, currency)}
    </span>
  )
}

export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy()
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-secondary !px-3"
      aria-pressed={hidden}
      aria-label={hidden ? 'Tampilkan nilai uang' : 'Sembunyikan nilai uang'}
      title={hidden ? 'Tampilkan nilai' : 'Sembunyikan nilai'}
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}
