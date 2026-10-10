import { BarChart3, Boxes, Database, HandCoins, LayoutDashboard, ScanLine, Wrench, type LucideIcon } from 'lucide-react'
import type { UserRole } from '@/types/database'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** kosong = semua role boleh */
  roles?: UserRole[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { to: '/assets', label: 'Aset', icon: Boxes },
  { to: '/scan', label: 'Scan QR', icon: ScanLine },
  { to: '/loans', label: 'Peminjaman', icon: HandCoins },
  { to: '/maintenance', label: 'Perawatan', icon: Wrench },
  { to: '/reports', label: 'Laporan', icon: BarChart3 },
  { to: '/master', label: 'Master Data', icon: Database, roles: ['admin', 'staff'] },
]
