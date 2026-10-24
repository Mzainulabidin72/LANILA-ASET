import { Bitcoin, Car, Coins, Home, Landmark, Laptop, Package, PieChart, PiggyBank, TrendingUp, type LucideIcon } from 'lucide-react'
import type { AssetClass } from '@/types/wealth'

export const CLASS_ICON: Record<AssetClass, LucideIcon> = {
  cash: Landmark,
  stock: TrendingUp,
  fund: PieChart,
  deposit: PiggyBank,
  gold: Coins,
  crypto: Bitcoin,
  property: Home,
  vehicle: Car,
  valuable: Laptop,
  other: Package,
}

/** Warna grafik alokasi per kategori */
export const CLASS_COLOR: Record<AssetClass, string> = {
  cash: '#0e7490',
  stock: '#6366f1',
  fund: '#8b5cf6',
  deposit: '#14b8a6',
  gold: '#f59e0b',
  crypto: '#ec4899',
  property: '#22c55e',
  vehicle: '#64748b',
  valuable: '#0ea5e9',
  other: '#94a3b8',
}
