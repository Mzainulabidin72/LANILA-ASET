import { z } from 'zod'
import type { AssetCondition, AssetStatus } from '@/types/database'

const text = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter`)

export const assetFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama aset minimal 2 karakter').max(150, 'Maksimal 150 karakter'),
  category_id: z.string(),
  brand: text(100),
  model: text(100),
  serial_number: text(100),
  acquisition_date: z.string().refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid'),
  acquisition_price: z.string().regex(/^\d{0,13}$/, 'Isi angka saja, tanpa titik atau koma'),
  location_id: z.string(),
  responsible_employee_id: z.string(),
  condition: z.enum(['baik', 'rusak_ringan', 'rusak_berat', 'hilang']),
  status: z.enum(['aktif', 'dipinjam', 'perawatan', 'dihapus']),
  notes: text(1000),
})
export type AssetFormValues = z.infer<typeof assetFormSchema>

export const EMPTY_ASSET_FORM: AssetFormValues = {
  name: '',
  category_id: '',
  brand: '',
  model: '',
  serial_number: '',
  acquisition_date: '',
  acquisition_price: '',
  location_id: '',
  responsible_employee_id: '',
  condition: 'baik' as AssetCondition,
  status: 'aktif' as AssetStatus,
  notes: '',
}

const nn = (v: string) => (v.trim() === '' ? null : v.trim())

/** Ubah nilai form (semua string) menjadi payload database. */
export function toAssetPayload(v: AssetFormValues) {
  return {
    name: v.name.trim(),
    category_id: nn(v.category_id),
    brand: nn(v.brand),
    model: nn(v.model),
    serial_number: nn(v.serial_number),
    acquisition_date: nn(v.acquisition_date),
    acquisition_price: v.acquisition_price === '' ? 0 : Number(v.acquisition_price),
    location_id: nn(v.location_id),
    responsible_employee_id: nn(v.responsible_employee_id),
    condition: v.condition,
    status: v.status,
    notes: nn(v.notes),
  }
}

// ----- Master data -----
export const nameDescSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Maksimal 100 karakter'),
  description: text(300),
})

export const employeeSchema = z.object({
  full_name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Maksimal 100 karakter'),
  employee_number: text(50),
  position: text(100),
  phone: z.string().trim().max(20, 'Maksimal 20 karakter').regex(/^[0-9+\-\s]*$/, 'Nomor telepon tidak valid'),
  email: z.string().trim().email('Format email tidak valid').or(z.literal('')),
  is_active: z.boolean(),
})
