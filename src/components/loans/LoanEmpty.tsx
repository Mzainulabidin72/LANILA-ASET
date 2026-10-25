import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, HandCoins, Plus, SearchX } from 'lucide-react'
import type { LoanTab } from '@/lib/loans'

interface Props { tab: LoanTab; filtered: boolean; canCreate: boolean; onCreate: () => void; onClear: () => void }

const TEXT: Record<LoanTab, { icon: LucideIcon; title: string; desc: string; cta: boolean }> = {
  active: { icon: HandCoins, title: 'Belum ada peminjaman aktif', desc: 'Aset yang sedang dipinjam dan belum lewat jatuh tempo akan tampil di sini.', cta: true },
  overdue: { icon: CheckCircle2, title: 'Tidak ada peminjaman terlambat', desc: 'Semua peminjaman aktif masih dalam batas jatuh tempo.', cta: false },
  returned: { icon: HandCoins, title: 'Belum ada pengembalian', desc: 'Peminjaman yang sudah dikembalikan akan tercatat di sini.', cta: false },
  all: { icon: HandCoins, title: 'Belum ada peminjaman', desc: 'Catat peminjaman pertama untuk mulai memantau aset yang keluar.', cta: true },
}

/** Panel kosong yang ringkas (bukan kartu besar). Pesan berbeda untuk "tidak ada data" dan "tidak ada hasil pencarian". */
export default function LoanEmpty({ tab, filtered, canCreate, onCreate, onClear }: Props) {
  const t = filtered ? { icon: SearchX, title: 'Tidak ada peminjaman yang cocok', desc: 'Coba ubah kata kunci atau rentang tanggal.', cta: false } : TEXT[tab]
  const Icon = t.icon
  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-8 text-center">
      <span className="mb-3 rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon size={26} aria-hidden="true" /></span>
      <h2 className="text-base font-semibold">{t.title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{t.desc}</p>
      {filtered && <button className="btn-secondary mt-4" onClick={onClear}>Hapus filter</button>}
      {!filtered && t.cta && canCreate && (
        <button className="btn-primary mt-4" onClick={onCreate}><Plus size={18} aria-hidden="true" /> Pinjamkan Aset</button>
      )}
    </div>
  )
}
