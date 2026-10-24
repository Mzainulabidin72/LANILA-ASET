import { NavLink } from 'react-router-dom'
import { Boxes, HandCoins, LayoutDashboard, Menu, ScanLine } from 'lucide-react'

const ITEMS = [
  { to: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { to: '/assets', label: 'Aset', icon: Boxes },
  { to: '/scan', label: 'Scan', icon: ScanLine, highlight: true },
  { to: '/loans', label: 'Pinjam', icon: HandCoins },
  { to: '/more', label: 'Lainnya', icon: Menu },
]

/** Navigasi bawah untuk HP (layar < lg). */
export default function BottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-safe-bottom backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon, highlight }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400'
                }`
              }
            >
              {highlight ? (
                <span className="-mt-6 rounded-full bg-brand-700 p-3.5 text-white shadow-lg ring-4 ring-white dark:ring-slate-900">
                  <Icon size={24} />
                </span>
              ) : (
                <Icon size={22} />
              )}
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
