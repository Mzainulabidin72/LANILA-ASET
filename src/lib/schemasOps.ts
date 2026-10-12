import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter`)
const condition = z.enum(['baik', 'rusak_ringan', 'rusak_berat', 'hilang'])
const money = z.string().regex(/^\d{0,13}$/, 'Isi angka saja, tanpa titik atau koma')

// ----- Peminjaman -----
export const loanFormSchema = z
  .object({
    asset_id: z.string().min(1, 'Pilih aset yang akan dipinjam'),
    employee_id: z.string().min(1, 'Pilih peminjam'),
    loan_date: z.string().min(1, 'Tanggal pinjam wajib diisi'),
    due_date: z.string(),
    condition_out: condition,
    notes: text(500),
  })
  .refine((v) => !v.due_date || v.due_date >= v.loan_date, {
    path: ['due_date'],
    message: 'Jatuh tempo tidak boleh sebelum tanggal pinjam',
  })
export type LoanFormValues = z.infer<typeof loanFormSchema>

export const makeReturnSchema = (loanDate: string) =>
  z.object({
    return_date: z
      .string()
      .min(1, 'Tanggal kembali wajib diisi')
      .refine((v) => v >= loanDate, 'Tanggal kembali tidak boleh sebelum tanggal pinjam'),
    condition_in: condition,
    notes: text(500),
  })
export type ReturnFormValues = z.infer<ReturnType<typeof makeReturnSchema>>

// ----- Perawatan -----
export const maintenanceFormSchema = z.object({
  asset_id: z.string().min(1, 'Pilih aset'),
  title: z.string().trim().min(2, 'Judul minimal 2 karakter').max(150, 'Maksimal 150 karakter'),
  description: text(1000),
  scheduled_date: z.string().min(1, 'Tanggal jadwal wajib diisi'),
  interval_days: z
    .string()
    .regex(/^\d{0,4}$/, 'Isi angka saja')
    .refine((v) => v === '' || Number(v) > 0, 'Harus lebih dari 0'),
  cost: money,
  performed_by: text(100),
})
export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>

export const completeFormSchema = z.object({
  completed_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  cost: money,
  performed_by: text(100),
  schedule_next: z.boolean(),
})
export type CompleteFormValues = z.infer<typeof completeFormSchema>
