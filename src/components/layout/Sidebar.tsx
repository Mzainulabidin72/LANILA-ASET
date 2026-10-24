import { NavLink } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ROLE_LABEL } from '@/types/database'
import { NAV_ITEMS } from './navigation'

/** Sidebar untuk laptop/desktop (layar >= lg). */
export default function Sidebar() {
  const { profile, role, signOut, can } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const items = NAV_ITEMS.filter((i) => !i.roles || can(...i.roles))

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Navigasi utama">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-semibold">{profile?.full_name ?? 'Pengguna'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{role ? ROLE_LABEL[role] : '-'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="btn-secondary flex-1" aria-label="Ganti mode gelap/terang">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={signOut} className="btn-secondary flex-1" aria-label="Keluar">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
