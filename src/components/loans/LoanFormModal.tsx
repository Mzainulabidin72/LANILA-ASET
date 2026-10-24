import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import AssetPicker, { type PickAsset } from '@/components/assets/AssetPicker'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset, useLookups } from '@/hooks/useAssets'
import { useCreateLoan } from '@/hooks/useLoans'
import { todayISO } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { QUEUED_MSG } from '@/lib/offline/messages'
import { loanFormSchema, type LoanFormValues } from '@/lib/schemasOps'
import { CONDITION_LABEL } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  /** isi otomatis aset (mis. dari tombol "Pinjamkan" di halaman detail) */
  presetAssetId?: string
}

const blank = (): LoanFormValues => ({
  asset_id: '', employee_id: '', loan_date: todayISO(), due_date: '', condition_out: 'baik', notes: '',
})

export default function LoanFormModal({ open, onClose, presetAssetId }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const { employees } = useLookups()
  const create = useCreateLoan()
  const [picked, setPicked] = useState<PickAsset | null>(null)
  const preset = useAsset(open ? presetAssetId : undefined)

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: blank(),
  })

  useEffect(() => {
    if (open) { reset(blank()); setPicked(null) }
  }, [open, reset])

  // Aset dari tombol "Pinjamkan"
  useEffect(() => {
    const a = preset.data
    if (open && a && a.status === 'aktif' && !picked) {
      setPicked({ id: a.id, asset_code: a.asset_code, name: a.name, condition: a.condition })
      setValue('asset_id', a.id)
      setValue('condition_out', a.condition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.data, open])

  const choose = (a: PickAsset | null) => {
    setPicked(a)
    setValue('asset_id', a?.id ?? '', { shouldValidate: !!a })
    if (a?.condition) setValue('condition_out', a.condition)
  }

  const submit = async (v: LoanFormValues) => {
    try {
      const r = await create.mutateAsync({
        assetName: picked?.name,
        asset_id: v.asset_id,
        employee_id: v.employee_id,
        loan_date: v.loan_date,
        due_date: v.due_date || null,
        condition_out: v.condition_out,
        notes: v.notes.trim() || null,
        created_by: user?.id,
      })
      toast.success(r.queued ? QUEUED_MSG : 'Peminjaman berhasil dicatat.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, 'Peminjaman gagal disimpan.'))
    }
  }

  const presetBlocked = !!presetAssetId && preset.data && preset.data.status !== 'aktif'

  return (
    <Modal open={open} onClose={onClose} title="Pinjamkan Aset">
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        {presetBlocked && (
          <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            Aset yang dipilih berstatus bukan Aktif, jadi tidak bisa dipinjam. Pilih aset lain.
          </p>
        )}
        <div>
          <span className="label">Aset *</span>
          <AssetPicker selected={picked} onSelect={choose} onlyActive error={errors.asset_id?.message} />
        </div>
        <div>
          <label htmlFor="employee_id" className="label">Peminjam *</label>
          <select id="employee_id" className="input" {...register('employee_id')}>
            <option value="">— Pilih pegawai —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          {errors.employee_id && <p className="field-error">{errors.employee_id.message}</p>}
          {employees.length === 0 && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Belum ada pegawai aktif. Tambahkan di Master Data.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="loan_date" className="label">Tanggal pinjam *</label>
            <input id="loan_date" type="date" className="input" {...register('loan_date')} />
            {errors.loan_date && <p className="field-error">{errors.loan_date.message}</p>}
          </div>
          <div>
            <label htmlFor="due_date" className="label">Jatuh tempo</label>
            <input id="due_date" type="date" className="input" {...register('due_date')} />
            {errors.due_date && <p className="field-error">{errors.due_date.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="condition_out" className="label">Kondisi saat dipinjam</label>
          <Controller
            control={control}
            name="condition_out"
            render={({ field }) => (
              <select id="condition_out" className="input" value={field.value} onChange={field.onChange}>
                {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
          />
        </div>
        <div>
          <label htmlFor="notes" className="label">Catatan</label>
          <textarea id="notes" rows={2} className="input !py-2.5" {...register('notes')} />
          {errors.notes && <p className="field-error">{errors.notes.message}</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Batal</button>
          <button type="submit" className="btn-primary flex-1" disabled={create.isPending}>
            {create.isPending && <Loader2 size={18} className="animate-spin" />} Simpan
          </button>
        </div>
      </form>
    </Modal>
  )
}
