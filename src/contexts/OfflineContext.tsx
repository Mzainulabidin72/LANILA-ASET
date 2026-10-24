import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { deleteOp, isNetworkError, listOps, putOp, type OpInput, type QueuedOp } from '@/lib/offline/db'
import { executeOp } from '@/lib/offline/ops'
import { errorMessage } from '@/lib/errors'
import { uuidv4 } from '@/lib/utils'

interface OfflineCtx {
  online: boolean
  items: QueuedOp[]
  pendingCount: number
  failedCount: number
  syncing: boolean
  /** Jalankan langsung bila online & antrean kosong; kalau tidak, simpan ke antrean. */
  submit: (op: OpInput) => Promise<{ queued: boolean }>
  syncNow: () => Promise<void>
  retry: (id: string) => Promise<void>
  discard: (id: string) => Promise<void>
}

const Ctx = createContext<OfflineCtx | null>(null)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const qc = useQueryClient()
  const toast = useToast()
  const online = useOnlineStatus()
  const [items, setItems] = useState<QueuedOp[]>([])
  const [syncing, setSyncing] = useState(false)
  const itemsRef = useRef<QueuedOp[]>([])
  const syncingRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const mine = (await listOps()).filter((o) => o.userId === userId)
      itemsRef.current = mine
      setItems(mine)
    } catch {
      itemsRef.current = []
      setItems([])
    }
  }, [userId])

  const syncNow = useCallback(async () => {
    if (!userId || syncingRef.current || !navigator.onLine) return
    syncingRef.current = true
    setSyncing(true)
    let ok = 0
    let failed = 0
    try {
      const todo = (await listOps()).filter((o) => o.userId === userId && o.status === 'pending')
      for (const op of todo) {
        try {
          await executeOp(op)
          await deleteOp(op.id)
          ok++
        } catch (e) {
          if (isNetworkError(e)) break // sinyal putus lagi: berhenti, coba lagi nanti
          const raw = (e as { message?: string } | null)?.message
          await putOp({ ...op, status: 'failed', attempts: op.attempts + 1, error: errorMessage(e, raw || 'Gagal disinkronkan.') })
          failed++
        }
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      await refresh()
    }
    if (ok > 0) {
      qc.invalidateQueries()
      toast.success(`${ok} perubahan berhasil disinkronkan.`)
    }
    if (failed > 0) toast.error(`${failed} perubahan gagal disinkronkan. Buka menu Sinkronisasi untuk detailnya.`)
  }, [userId, qc, toast, refresh])

  const submit = useCallback(
    async (input: OpInput): Promise<{ queued: boolean }> => {
      if (!userId) throw new Error('Sesi berakhir. Silakan masuk kembali.')
      const hasPending = itemsRef.current.some((o) => o.status === 'pending')
      // Jika sudah ada antrean, perubahan baru ikut antre supaya urutan tetap benar.
      if (navigator.onLine && !hasPending) {
        try {
          await executeOp(input)
          return { queued: false }
        } catch (e) {
          if (!isNetworkError(e)) throw e
        }
      }
      const op: QueuedOp = { ...input, id: uuidv4(), userId, createdAt: Date.now(), attempts: 0, status: 'pending' }
      await putOp(op)
      await refresh()
      if (navigator.onLine) void syncNow()
      return { queued: true }
    },
    [userId, refresh, syncNow],
  )

  const retry = useCallback(
    async (id: string) => {
      const op = itemsRef.current.find((o) => o.id === id)
      if (!op) return
      await putOp({ ...op, status: 'pending', error: undefined })
      await refresh()
      void syncNow()
    },
    [refresh, syncNow],
  )

  const discard = useCallback(
    async (id: string) => {
      await deleteOp(id)
      await refresh()
    },
    [refresh],
  )

  // Muat antrean saat login, lalu coba sinkron
  useEffect(() => {
    void refresh().then(() => syncNow())
  }, [refresh, syncNow])

  // Kembali online -> sinkron otomatis
  useEffect(() => {
    if (online) void syncNow()
  }, [online, syncNow])

  // Cadangan: coba lagi tiap 30 detik & saat tab kembali aktif (sinyal "online" kadang tidak akurat)
  useEffect(() => {
    const tick = () => {
      if (itemsRef.current.some((o) => o.status === 'pending')) void syncNow()
    }
    const timer = setInterval(tick, 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') { void refresh(); tick() } }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [syncNow, refresh])

  const value = useMemo<OfflineCtx>(
    () => ({
      online,
      items,
      pendingCount: items.filter((o) => o.status === 'pending').length,
      failedCount: items.filter((o) => o.status === 'failed').length,
      syncing,
      submit,
      syncNow,
      retry,
      discard,
    }),
    [online, items, syncing, submit, syncNow, retry, discard],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useOffline(): OfflineCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOffline harus dipakai di dalam OfflineProvider')
  return c
}
