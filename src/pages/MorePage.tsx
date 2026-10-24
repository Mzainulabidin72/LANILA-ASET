import { Link } from 'react-router-dom'
import { LogOut, Moon, Sun, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ROLE_LABEL } from '@/types/database'
import { NAV_ITEMS } from '@/components/layout/navigation'

/** Menu "Lainnya" untuk HP. */
export default function MorePage() {
  const { profile, role, signOut, can } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const extra = NAV_ITEMS.filter((i) => ['/maintenance', '/reports', '/master', '/sync'].includes(i.to)).filter((i) => !i.roles || can(...i.roles))

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <p className="font-semibold">{profile?.full_name ?? 'Pengguna'}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{role ? ROLE_LABEL[role] : '-'}</p>
      </div>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {extra.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-[52px] items-center gap-3 px-4">
            <Icon size={20} className="text-brand-700 dark:text-brand-300" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
          </Link>
        ))}
        <button onClick={toggleTheme} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left">
          {theme === 'dark' ? <Sun size={20} className="text-brand-700 dark:text-brand-300" /> : <Moon size={20} className="text-brand-700" />}
          <span className="flex-1 text-sm font-medium">Mode {theme === 'dark' ? 'Terang' : 'Gelap'}</span>
        </button>
      </div>
      <button onClick={signOut} className="btn-secondary w-full text-red-600 dark:text-red-400">
        <LogOut size={18} /> Keluar
      </button>
    </div>
  )
}
