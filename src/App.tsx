import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { isSupabaseConfigured } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import MorePage from '@/pages/MorePage'
import ComingSoonPage from '@/pages/ComingSoonPage'
import NotFoundPage from '@/pages/NotFoundPage'

function ConfigWarning() {
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
      File <code>.env</code> belum diisi. Salin <code>.env.example</code> menjadi <code>.env</code> lalu isi URL &amp; anon key Supabase, kemudian restart <code>npm run dev</code>.
    </div>
  )
}

export default function App() {
  return (
    <>
      {!isSupabaseConfigured && <ConfigWarning />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/assets" element={<ComingSoonPage title="Aset" stage={4} />} />
            <Route path="/scan" element={<ComingSoonPage title="Scan QR" stage={4} />} />
            <Route path="/loans" element={<ComingSoonPage title="Peminjaman" stage={5} />} />
            <Route path="/maintenance" element={<ComingSoonPage title="Perawatan" stage={5} />} />
            <Route path="/reports" element={<ComingSoonPage title="Laporan" stage={5} />} />
            <Route path="/more" element={<MorePage />} />
          </Route>
        </Route>

        {/* Master data hanya untuk Admin & Staf */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
          <Route element={<AppLayout />}>
            <Route path="/master" element={<ComingSoonPage title="Master Data" stage={4} />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
