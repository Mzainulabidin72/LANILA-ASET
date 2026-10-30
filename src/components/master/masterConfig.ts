import type { ZodTypeAny } from 'zod'
import { employeeSchema, nameDescSchema } from '@/lib/schemas'
import type { MasterKey } from '@/lib/master'
import type { MasterTable } from '@/hooks/useMaster'

export interface FieldDef { name: string; label: string; type?: 'text' | 'textarea' | 'tel' | 'email' | 'checkbox'; placeholder?: string }

export interface TabDef {
  key: MasterKey
  table: MasterTable
  label: string
  singular: string
  addLabel: string
  emptyText: string
  searchPlaceholder: string
  schema: ZodTypeAny
  fields: FieldDef[]
  titleKey: string
  /** nilai awal form tambah */
  empty: Record<string, unknown>
}

/** Hanya field yang benar-benar ada di skema database. */
export const TABS: TabDef[] = [
  {
    key: 'categories', table: 'aset_categories', label: 'Kategori', singular: 'kategori', addLabel: 'Tambah Kategori',
    emptyText: 'Belum ada kategori.', searchPlaceholder: 'Cari nama atau keterangan kategori', schema: nameDescSchema, titleKey: 'name',
    fields: [{ name: 'name', label: 'Nama kategori *' }, { name: 'description', label: 'Keterangan', type: 'textarea' }],
    empty: { name: '', description: '' },
  },
  {
    key: 'locations', table: 'aset_locations', label: 'Lokasi', singular: 'lokasi', addLabel: 'Tambah Lokasi',
    emptyText: 'Belum ada lokasi.', searchPlaceholder: 'Cari nama atau keterangan lokasi', schema: nameDescSchema, titleKey: 'name',
    fields: [{ name: 'name', label: 'Nama lokasi *' }, { name: 'description', label: 'Keterangan', type: 'textarea' }],
    empty: { name: '', description: '' },
  },
  {
    key: 'employees', table: 'aset_employees', label: 'Pegawai', singular: 'pegawai', addLabel: 'Tambah Pegawai',
    emptyText: 'Belum ada pegawai.', searchPlaceholder: 'Cari nama, nomor pegawai, atau jabatan', schema: employeeSchema, titleKey: 'full_name',
    fields: [
      { name: 'full_name', label: 'Nama lengkap *' },
      { name: 'employee_number', label: 'NIP / Nomor pegawai' },
      { name: 'position', label: 'Jabatan' },
      { name: 'phone', label: 'Telepon', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'is_active', label: 'Pegawai aktif', type: 'checkbox' },
    ],
    empty: { full_name: '', employee_number: '', position: '', phone: '', email: '', is_active: true },
  },
]

/** Nilai kosong dikirim sebagai null supaya kolom unik (mis. NIP) tidak bentrok antar baris kosong. */
export function cleanValues(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) out[k] = typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v
  return out
}
