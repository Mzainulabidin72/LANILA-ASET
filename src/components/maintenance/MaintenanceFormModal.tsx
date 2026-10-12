import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import AssetPicker, { type PickAsset } from '@/components/assets/AssetPicker'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset } from '@/hooks/useAssets'
import { useSaveMaintenance, type MaintenanceWithRefs } from '@/hooks/useMaintenance'
import { todayISO } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { maintenanceFormSchema, type MaintenanceFormValues } from '@/lib/schemasOps'

interface Props {
  open: boolean
  onClose: () => void
  editing?: MaintenanceWithRefs | null
  presetAssetId?: string
}

const blank = (): MaintenanceFormValues => ({
  asset_id: '', title: '', description: '', scheduled_date: todayISO(), interval_days: '', cost: '', performed_by: '',
})

export default function MaintenanceFormModal({ open, onClose, editing, presetAssetId }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const save = useSaveMaintenance()
  const [picked, setPicked] = useState<PickAsset | null>(null)
  const preset = useAsset(open && !editing ? presetAssetId : undefined)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: blank(),
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        asset_id: editing.asset_id,
        title: editing.title,
        description: editing.description ?? '',
        scheduled_date: editing.scheduled_date,
        interval_days: editing.interval_days ? String(editing.interval_days) : '',
        cost: editing.cost ? String(Math.round(Number(editing.cost))) : '',
        performed_by: editing.performed_by ?? '',
      })
      setPicked({ id: editing.asset_id, asset_code: editing.asset?.asset_code ?? '', name: editing.asset?.name ?? '' })
    } else {
      reset(blank())
      setPicked(null)
    }
  }, [open, editing, reset])

  useEffect(() => {
    const a = preset.data
    if (open && !editing && a && !picked) {
      setPicked({ id: a.id, asset_code: a.asset_code, name: a.name })
      setValue('asset_id', a.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.data, open])

  const choose = (a: PickAsset | null) => {
    setPicked(a)
    setValue('asset_id', a?.id ?? '', { shouldValidate: !!a })
  }

  const submit = async (v: MaintenanceFormValues) => {
    try {
      await save.mutateAsync({
        id: editing?.id,
        asset_id: v.asset_id,
        title: v.title.trim(),
        description: v.description.trim() || null,
        scheduled_date: v.scheduled_date,
        interval_days: v.interval_days ? Number(v.interval_days) : null,
        cost: v.cost ? Number(v.cost) : 0,
        performed_by: v.performed_by.trim() || null,
        created_by: user?.id,
      })
      toast.success(editing ? 'Jadwal diperbarui.' : 'Jadwal perawatan ditambahkan.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, 'Jadwal gagal disimpan.'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Ubah Jadwal Perawatan' : 'Jadwalkan Perawatan'}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <div>
          <span className="label">Aset *</span>
          <AssetPicker selected={picked} onSelect={choose} disabled={!!editing} error={errors.asset_id?.message} />
        </div>
        <div>
          <label htmlFor="title" className="label">Jenis perawatan *</label>
          <input id="title" className="input" placeholder="mis. Servis berkala AC" {...register('title')} />
          {errors.title && <p className="field-error">{errors.title.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="scheduled_date" className="label">Tanggal jadwal *</label>
            <input id="scheduled_date" type="date" className="input" {...register('scheduled_date')} />
            {errors.scheduled_date && <p className="field-error">{errors.scheduled_date.message}</p>}
          </div>
          <div>
            <label htmlFor="interval_days" className="label">Ulangi tiap (hari)</label>
            <input id="interval_days" inputMode="numeric" className="input" placeholder="mis. 90" {...register('interval_days')} />
            {errors.interval_days && <p className="field-error">{errors.interval_days.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cost" className="label">Perkiraan biaya (Rp)</label>
            <input id="cost" inputMode="numeric" className="input" {...register('cost')} />
            {errors.cost && <p className="field-error">{errors.cost.message}</p>}
          </div>
          <div>
            <label htmlFor="performed_by" className="label">Teknisi / vendor</label>
            <input id="performed_by" className="input" {...register('performed_by')} />
            {errors.performed_by && <p className="field-error">{errors.performed_by.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="description" className="label">Keterangan</label>
          <textarea id="description" rows={2} className="input !py-2.5" {...register('description')} />
          {errors.description && <p className="field-error">{errors.description.message}</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Batal</button>
          <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>
            {save.isPending && <Loader2 size={18} className="animate-spin" />} Simpan
          </button>
        </div>
      </form>
    </Modal>
  )
}
