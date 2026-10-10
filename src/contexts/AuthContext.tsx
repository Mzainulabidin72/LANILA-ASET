import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

interface AuthCtx {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendResetEmail: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  can: (...roles: UserRole[]) => boolean
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('aset_profiles').select('*').eq('id', userId).maybeSingle()
    setProfile((data as Profile | null) ?? null)
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        // setTimeout menghindari deadlock di callback auth Supabase
        setTimeout(() => loadProfile(s.user.id), 0)
      } else {
        setProfile(null)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // Hapus cache data API supaya data tidak bocor ke user lain di perangkat yang sama
    if ('caches' in window) {
      await Promise.all(['api-cache', 'aset-photos'].map((k) => caches.delete(k)))
    }
  }

  const sendResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new Error(translateAuthError(error.message))
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(translateAuthError(error.message))
  }

  const role = profile?.is_active === false ? null : profile?.role ?? null
  const can = (...roles: UserRole[]) => !!role && roles.includes(role)

  return (
    <Ctx.Provider
      value={{ session, user: session?.user ?? null, profile, role, loading, signIn, signOut, sendResetEmail, updatePassword, can }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return c
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email atau kata sandi salah.'
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
  if (m.includes('fetch') || m.includes('network')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  if (m.includes('password should be')) return 'Kata sandi terlalu lemah (minimal 8 karakter).'
  return 'Terjadi kesalahan. Silakan coba lagi.'
}
