import { Download, Share, X } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

/** Banner "Install App": tombol langsung (Android/desktop) atau petunjuk Add to Home Screen (iOS). */
export default function InstallBanner() {
  const { installed, dismissed, canInstall, showIosHint, install, dismiss } = useInstallPrompt()

  if (installed || dismissed || (!canInstall && !showIosHint)) return null

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-800 dark:bg-brand-900/30 lg:mx-8">
      <div className="mt-0.5 rounded-lg bg-brand-700 p-2 text-white">
        {canInstall ? <Download size={18} /> : <Share size={18} />}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-brand-900 dark:text-brand-100">Pasang LANILA ASET di perangkat Anda</p>
        {canInstall ? (
          <p className="mt-0.5 text-brand-800/80 dark:text-brand-200/80">Akses lebih cepat, tampil layar penuh, dan bisa dipakai offline.</p>
        ) : (
          <p className="mt-0.5 text-brand-800/80 dark:text-brand-200/80">
            Ketuk tombol <Share size={14} className="mx-0.5 inline" /> <b>Bagikan</b> di Safari, lalu pilih <b>"Add to Home Screen"</b> (Tambah ke Layar Utama).
          </p>
        )}
        {canInstall && (
          <button onClick={install} className="btn-primary mt-2 min-h-[44px]">
            Install App
          </button>
        )}
      </div>
      <button onClick={dismiss} aria-label="Tutup" className="btn-ghost -mr-1 -mt-1 min-h-[44px] min-w-[44px] !px-0">
        <X size={18} />
      </button>
    </div>
  )
}
