import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import PageFallback from '@/components/ui/PageFallback'
import { isSupabaseConfigured } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage'

// Halaman lain dimuat bertahap (lazy) supaya buka pertama lebih cepat & skor Lighthouse bagus.
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const AssetsPage = lazy(() => import('@/pages/AssetsPage'))
const AssetDetailPage = lazy(() => import('@/pages/AssetDetailPage'))
const AssetFormPage = lazy(() => import('@/pages/AssetFormPage'))
const ScanPage = lazy(() => import('@/pages/ScanPage'))
const LoansPage = lazy(() => import('@/pages/LoansPage'))
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const MasterDataPage = lazy(() => import('@/pages/MasterDataPage'))
const SyncPage = lazy(() => import('@/pages/SyncPage'))
const MorePage = lazy(() => import('@/pages/MorePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

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
      <Suspense fallback={<PageFallback />}>
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
              <Route path="/assets/new" element={<AssetFormPage />} />
              <Route path="/assets/:id" element={<AssetDetailPage />} />
              <Route path="/assets/:id/edit" element={<AssetFormPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="/more" element={<MorePage />} />
            </Route>
          </Route>

          {/* Hanya Admin & Staf */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
            <Route element={<AppLayout />}>
              <Route path="/master" element={<MasterDataPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}
