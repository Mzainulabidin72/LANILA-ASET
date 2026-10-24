import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FullScreenLoader } from '@/components/ui/Skeleton'
import type { UserRole } from '@/types/database'

interface Props { allowedRoles?: UserRole[] }

/** Melindungi route: wajib login, dan (opsional) wajib punya role tertentu. */
export default function ProtectedRoute({ allowedRoles }: Props) {
  const { session, role, profile, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // Sudah login tapi akun dinonaktifkan / profil belum ada
  if (!profile || !role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">Belum punya akses</h1>
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
          Akun ini belum didaftarkan di LANILA ASET atau telah dinonaktifkan. Hubungi Admin untuk mendapat akses.
        </p>
        <button className="btn-secondary" onClick={signOut}>Keluar</button>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
