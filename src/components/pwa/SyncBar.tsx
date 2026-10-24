import { Link } from 'react-router-dom'
import { CloudUpload, Loader2, TriangleAlert, WifiOff } from 'lucide-react'
import { useOffline } from '@/contexts/OfflineContext'

/** Pita status di atas halaman: offline, ada perubahan menunggu sinkron, atau ada yang gagal. */
export default function SyncBar() {
  const { online, pendingCount, failedCount, syncing, syncNow } = useOffline()
  if (online && pendingCount === 0 && failedCount === 0) return null

  const tone = !online
    ? 'bg-amber-500 text-amber-950'
    : failedCount > 0
      ? 'bg-red-700 text-white'
      : 'bg-brand-800 text-white'

  return (
    <div role={failedCount > 0 || !online ? 'alert' : 'status'} className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-xs font-semibold ${tone}`}>
      <span className="inline-flex items-center gap-1.5">
        {!online ? <WifiOff size={14} /> : failedCount > 0 ? <TriangleAlert size={14} /> : syncing ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
        {!online
          ? `Anda sedang offline. Data terakhir tetap bisa dilihat${pendingCount > 0 ? `; ${pendingCount} perubahan menunggu` : ''}.`
          : failedCount > 0
            ? `${failedCount} perubahan gagal disinkronkan.`
            : syncing
              ? 'Menyinkronkan perubahan…'
              : `${pendingCount} perubahan menunggu sinkronisasi.`}
      </span>
      {online && pendingCount > 0 && !syncing && (
        <button onClick={() => void syncNow()} className="min-h-[32px] rounded-lg bg-white/20 px-3 underline-offset-2 hover:bg-white/30">
          Sinkronkan sekarang
        </button>
      )}
      <Link to="/sync" className="min-h-[32px] rounded-lg px-2 py-1.5 underline">Lihat detail</Link>
    </div>
  )
}
