import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CloudDownload, Loader2, RefreshCw, RotateCcw, Trash2, WifiOff } from 'lucide-react'
import { useOffline } from '@/contexts/OfflineContext'
import { prepareOffline, PREPARED_KEY } from '@/lib/offline/prepare'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

export default function SyncPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { online, items, pendingCount, failedCount, syncing, syncNow, retry, discard } = useOffline()
  const [discarding, setDiscarding] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [preparedAt, setPreparedAt] = useState<number | null>(() => {
    try { return Number(localStorage.getItem(PREPARED_KEY)) || null } catch { return null }
  })

  const prepare = async () => {
    setProgress({ done: 0, total: 0 })
    try {
      const r = await prepareOffline(qc, (done, total) => setProgress({ done, total }))
      setPreparedAt(Date.now())
      toast.success(`Data offline siap: ${r.assets} aset dan ${r.photos} foto tersimpan.`)
    } catch (e) {
      toast.error(errorMessage(e, 'Gagal menyiapkan data offline.'))
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sinkronisasi</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Perubahan yang dibuat saat offline akan dikirim otomatis begitu koneksi kembali.</p>
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className={`rounded-xl p-2 ${online ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
            {online ? <CheckCircle2 size={20} /> : <WifiOff size={20} />}
          </span>
          <div>
            <p className="font-semibold">{online ? 'Online' : 'Offline'}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{pendingCount} menunggu · {failedCount} gagal</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => void syncNow()} disabled={!online || syncing || pendingCount === 0}>
          {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Sinkronkan sekarang
        </button>
      </section>

      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Semua sudah tersinkron" description="Tidak ada perubahan yang menunggu dikirim." />
      ) : (
        <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((op) => (
            <li key={op.id} className="space-y-1.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{op.label}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Dibuat {formatDateTime(new Date(op.createdAt))}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${op.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                  {op.status === 'failed' ? 'Gagal' : 'Menunggu'}
                </span>
              </div>
              {op.error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-300">{op.error}</p>}
              <div className="flex gap-2 pt-1">
                {op.status === 'failed' && (
                  <button className="btn-secondary" onClick={() => void retry(op.id)} disabled={!online}><RotateCcw size={16} /> Coba lagi</button>
                )}
                <button className="btn-secondary text-red-600 dark:text-red-400" onClick={() => setDiscarding(op.id)}><Trash2 size={16} /> Buang</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="card space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-2 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><CloudDownload size={20} /></span>
          <div>
            <h2 className="font-semibold">Siapkan data offline</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Unduh 100 aset terbaru beserta fotonya sekarang, supaya bisa dibuka di tempat tanpa sinyal.
              {preparedAt ? ` Terakhir disiapkan ${formatDateTime(new Date(preparedAt))}.` : ''}
            </p>
          </div>
        </div>
        {progress && (
          <div aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full bg-brand-700 transition-all" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '10%' }} />
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{progress.total ? `${progress.done} dari ${progress.total}` : 'Menyiapkan…'}</p>
          </div>
        )}
        <button className="btn-secondary w-full sm:w-auto" onClick={() => void prepare()} disabled={!online || progress !== null}>
          {progress ? <Loader2 size={18} className="animate-spin" /> : <CloudDownload size={18} />} Siapkan sekarang
        </button>
        {!online && <p className="text-xs text-slate-600 dark:text-slate-400">Hubungkan ke internet untuk menyiapkan data offline.</p>}
      </section>

      <ConfirmDialog
        open={!!discarding}
        danger
        title="Buang perubahan ini?"
        message="Perubahan ini tidak akan dikirim ke server dan tidak bisa dikembalikan."
        confirmLabel="Ya, buang"
        onConfirm={async () => { if (discarding) await discard(discarding); setDiscarding(null) }}
        onClose={() => setDiscarding(null)}
      />
    </div>
  )
}
