/** Format angka untuk tampilan. Nilai tersembunyi ditampilkan sebagai titik-titik. */
export const HIDDEN = '•••••'

export function formatMoney(value: number | null | undefined, currency = 'IDR'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  const idr = currency === 'IDR'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: idr ? 0 : 2,
    maximumFractionDigits: idr ? 0 : 2,
  }).format(value)
}

/** Jumlah unit: hingga 8 desimal, tanpa nol berlebih. */
export function formatQuantity(q: number | null | undefined): string {
  if (q === null || q === undefined || Number.isNaN(q)) return '-'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 8 }).format(q)
}

export function formatPercent(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '-'
  const sign = p > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(p)}%`
}

export function formatSignedMoney(value: number | null | undefined, currency = 'IDR'): string {
  if (value === null || value === undefined) return '-'
  return `${value > 0 ? '+' : ''}${formatMoney(value, currency)}`
}
