import { RefreshCw, WifiOff } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Notifikasi "Versi baru tersedia, muat ulang" + info siap offline. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // cek update tiap 1 jam selama aplikasi terbuka
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 p-3 text-sm text-white shadow-2xl dark:bg-slate-100 dark:text-slate-900 lg:bottom-6 lg:left-auto lg:right-6"
    >
      {needRefresh ? <RefreshCw size={18} className="shrink-0" /> : <WifiOff size={18} className="shrink-0" />}
      <p className="flex-1">
        {needRefresh ? 'Versi baru tersedia, muat ulang.' : 'Aplikasi siap dipakai offline.'}
      </p>
      {needRefresh ? (
        <button onClick={() => updateServiceWorker(true)} className="min-h-[44px] rounded-xl bg-brand-500 px-4 font-semibold text-white">
          Muat Ulang
        </button>
      ) : null}
      <button
        onClick={() => { setNeedRefresh(false); setOfflineReady(false) }}
        className="min-h-[44px] rounded-xl px-3 font-medium opacity-80 hover:opacity-100"
      >
        Tutup
      </button>
    </div>
  )
}
