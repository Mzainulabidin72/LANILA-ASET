import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { isSupabaseConfigured } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import AssetsPage from '@/pages/AssetsPage'
import AssetDetailPage from '@/pages/AssetDetailPage'
import AssetFormPage from '@/pages/AssetFormPage'
import ScanPage from '@/pages/ScanPage'
import LoansPage from '@/pages/LoansPage'
import MaintenancePage from '@/pages/MaintenancePage'
import ReportsPage from '@/pages/ReportsPage'
import MasterDataPage from '@/pages/MasterDataPage'
import MorePage from '@/pages/MorePage'
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

        {/* Semua role (Admin, Staf, Viewer). Tombol tambah/ubah di dalam halaman sudah dibatasi per role. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/more" element={<MorePage />} />
          </Route>
        </Route>

        {/* Hanya Admin & Staf */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
          <Route element={<AppLayout />}>
            <Route path="/assets/new" element={<AssetFormPage />} />
            <Route path="/assets/:id/edit" element={<AssetFormPage />} />
            <Route path="/master" element={<MasterDataPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
