export type LoanDisplay = 'dipinjam' | 'terlambat' | 'dikembalikan'

/** Status "Terlambat" dihitung otomatis: belum kembali & lewat jatuh tempo. */
export function loanDisplayStatus(l: { return_date: string | null; due_date: string | null }, today: string): LoanDisplay {
  if (l.return_date) return 'dikembalikan'
  if (l.due_date && l.due_date < today) return 'terlambat'
  return 'dipinjam'
}

const STYLE: Record<LoanDisplay, { label: string; cls: string }> = {
  dipinjam: { label: 'Dipinjam', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  terlambat: { label: 'Terlambat', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  dikembalikan: { label: 'Dikembalikan', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
}

export function LoanBadge({ value }: { value: LoanDisplay }) {
  const s = STYLE[value]
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}
