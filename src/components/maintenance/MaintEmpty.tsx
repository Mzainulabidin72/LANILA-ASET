import type { LucideIcon } from 'lucide-react'
import { CalendarPlus, CheckCircle2, ClipboardCheck, SearchX } from 'lucide-react'
import type { MaintTab } from '@/lib/maintenance'

interface Props { tab: MaintTab; filtered: boolean; canCreate: boolean; onCreate: () => void; onClear: () => void }

const TEXT: Record<MaintTab, { icon: LucideIcon; title: string; desc: string; cta: boolean }> = {
  upcoming: { icon: CalendarPlus, title: 'Belum ada jadwal perawatan', desc: 'Jadwalkan perawatan agar kondisi aset tetap terjaga.', cta: true },
  overdue: { icon: CheckCircle2, title: 'Tidak ada perawatan terlambat', desc: 'Semua jadwal yang belum selesai masih sesuai tenggat.', cta: false },
  done: { icon: ClipboardCheck, title: 'Belum ada perawatan selesai', desc: 'Riwayat perawatan yang selesai akan muncul di sini.', cta: false },
  all: { icon: CalendarPlus, title: 'Belum ada data perawatan', desc: 'Jadwalkan perawatan pertama agar kondisi aset tetap terjaga.', cta: true },
}

/** Panel kosong yang ringkas. Pesan hanya tampil untuk kondisi data yang sesuai (tidak saat memuat). */
export default function MaintEmpty({ tab, filtered, canCreate, onCreate, onClear }: Props) {
  const t = filtered ? { icon: SearchX, title: 'Tidak ada hasil ditemukan', desc: 'Coba ubah kata kunci atau rentang tanggal.', cta: false } : TEXT[tab]
  const Icon = t.icon
  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-8 text-center">
      <span className="mb-3 rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon size={26} aria-hidden="true" /></span>
      <h2 className="text-base font-semibold">{t.title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{t.desc}</p>
      {filtered && <button className="btn-secondary mt-4" onClick={onClear}>Hapus filter</button>}
      {!filtered && t.cta && canCreate && <button className="btn-primary mt-4" onClick={onCreate}>Jadwalkan Perawatan</button>}
    </div>
  )
}
