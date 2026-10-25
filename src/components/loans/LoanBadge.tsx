import { loanState, type LoanState } from '@/lib/loans'

export type LoanDisplay = LoanState

/** Status dihitung dari tanggal (aturan tunggal di lib/loans.ts): belum kembali & lewat jatuh tempo = Terlambat. */
export function loanDisplayStatus(l: { return_date: string | null; due_date: string | null }, today: string): LoanDisplay {
  return loanState(l, today)
}

// Status selalu ditulis sebagai teks (tidak hanya warna).
const STYLE: Record<LoanDisplay, { label: string; cls: string }> = {
  dipinjam: { label: 'Dipinjam', cls: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200' },
  terlambat: { label: 'Terlambat', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  dikembalikan: { label: 'Dikembalikan', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
}

export function LoanBadge({ value }: { value: LoanDisplay }) {
  const s = STYLE[value]
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}
