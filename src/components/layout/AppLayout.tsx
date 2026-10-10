import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Logo from '@/components/ui/Logo'
import InstallBanner from '@/components/pwa/InstallBanner'
import OfflineBadge from '@/components/pwa/OfflineBadge'
import UpdatePrompt from '@/components/pwa/UpdatePrompt'

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <OfflineBadge />
        {/* Header ringkas khusus HP */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
          <Logo size={32} />
        </header>
        <InstallBanner />
        <main className="pb-nav px-4 py-5 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <UpdatePrompt />
    </div>
  )
}
