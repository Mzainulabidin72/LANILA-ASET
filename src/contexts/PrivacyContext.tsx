import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface PrivacyCtx { hidden: boolean; toggle: () => void }
const Ctx = createContext<PrivacyCtx | null>(null)
const KEY = 'lanila-hide-values'

/** Sembunyikan/tampilkan nilai uang di seluruh aplikasi. Pilihan diingat di perangkat ini. */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h
      try { localStorage.setItem(KEY, next ? '1' : '0') } catch { /* abaikan */ }
      return next
    })
  }, [])
  return <Ctx.Provider value={{ hidden, toggle }}>{children}</Ctx.Provider>
}

export function usePrivacy(): PrivacyCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePrivacy harus dipakai di dalam PrivacyProvider')
  return c
}
