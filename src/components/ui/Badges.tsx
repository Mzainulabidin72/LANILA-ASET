import { CONDITION_LABEL, STATUS_LABEL, type AssetCondition, type AssetStatus } from '@/types/database'

const COND: Record<AssetCondition, string> = {
  baik: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  rusak_ringan: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  rusak_berat: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  hilang: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
}
const STAT: Record<AssetStatus, string> = {
  aktif: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  dipinjam: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  perawatan: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  dihapus: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}
const base = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold'

export function ConditionBadge({ value }: { value: AssetCondition }) {
  return <span className={`${base} ${COND[value]}`}>{CONDITION_LABEL[value]}</span>
}
export function StatusBadge({ value }: { value: AssetStatus }) {
  return <span className={`${base} ${STAT[value]}`}>{STATUS_LABEL[value]}</span>
}
