export type UserRole = 'admin' | 'staff' | 'viewer'
export type AssetCondition = 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang'
export type AssetStatus = 'aktif' | 'dipinjam' | 'perawatan' | 'dihapus'
export type LoanStatus = 'dipinjam' | 'dikembalikan' | 'terlambat'
export type MaintenanceStatus = 'terjadwal' | 'selesai' | 'dibatalkan'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category { id: string; name: string; description: string | null; created_at: string }
export interface Location { id: string; name: string; description: string | null; created_at: string }
export interface Employee {
  id: string
  full_name: string
  employee_number: string | null
  position: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

export interface Asset {
  id: string
  asset_code: string
  name: string
  category_id: string | null
  brand: string | null
  model: string | null
  serial_number: string | null
  acquisition_date: string | null
  acquisition_price: number
  location_id: string | null
  responsible_employee_id: string | null
  condition: AssetCondition
  status: AssetStatus
  photo_path: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  asset_id: string
  employee_id: string
  loan_date: string
  due_date: string | null
  return_date: string | null
  status: LoanStatus
  condition_out: AssetCondition | null
  condition_in: AssetCondition | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Maintenance {
  id: string
  asset_id: string
  title: string
  description: string | null
  scheduled_date: string
  completed_date: string | null
  interval_days: number | null
  cost: number
  status: MaintenanceStatus
  performed_by: string | null
  created_by: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  asset_id: string | null
  entity_type: string
  entity_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  created_at: string
}

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  hilang: 'Hilang',
}
export const STATUS_LABEL: Record<AssetStatus, string> = {
  aktif: 'Aktif',
  dipinjam: 'Dipinjam',
  perawatan: 'Perawatan',
  dihapus: 'Dihapus',
}
export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  staff: 'Staf',
  viewer: 'Viewer',
}
