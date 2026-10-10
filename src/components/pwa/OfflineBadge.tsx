import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function OfflineBadge() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-amber-950">
      <WifiOff size={14} />
      Anda sedang offline. Menampilkan data terakhir yang tersimpan.
    </div>
  )
}
