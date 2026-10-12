import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useCompleteMaintenance, type MaintenanceWithRefs } from '@/hooks/useMaintenance'
import { addDaysISO, todayISO } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { completeFormSchema, type CompleteFormValues } from '@/lib/schemasOps'

interface Props { item: MaintenanceWithRefs | null; onClose: () => void }

export default function CompleteModal({ item, onClose }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const complete = useCompleteMaintenance()
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CompleteFormValues>({
    resolver: zodResolver(completeFormSchema),
    defaultValues: { completed_date: todayISO(), cost: '', performed_by: '', schedule_next: true },
  })

  useEffect(() => {
    if (item) {
      reset({
        completed_date: todayISO(),
        cost: item.cost ? String(Math.round(Number(item.cost))) : '',
        performed_by: item.performed_by ?? '',
        schedule_next: true,
      })
    }
  }, [item, reset])

  const doneDate = watch('completed_date')
  const nextDate = item?.interval_days && doneDate ? addDaysISO(doneDate, item.interval_days) : null

  const submit = async (v: CompleteFormValues) => {
    if (!item) return
    try {
      const r = await complete.mutateAsync({
        item,
        completed_date: v.completed_date,
        cost: v.cost ? Number(v.cost) : 0,
        performed_by: v.performed_by.trim() || null,
        schedule_next: v.schedule_next,
        userId: user?.id,
      })
      toast.success(r.nextCreated ? 'Perawatan selesai. Jadwal berikutnya sudah dibuat.' : 'Perawatan ditandai selesai.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, 'Gagal menyimpan.'))
    }
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Tandai Selesai">
      {item && (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-semibold">{item.title}</p>
            <p className="text-slate-600 dark:text-slate-300">{item.asset?.name} · jadwal {formatDate(item.scheduled_date)}</p>
          </div>
          <div>
            <label htmlFor="completed_date" className="label">Tanggal selesai *</label>
            <input id="completed_date" type="date" className="input" {...register('completed_date')} />
            {errors.completed_date && <p className="field-error">{errors.completed_date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cost" className="label">Biaya aktual (Rp)</label>
              <input id="cost" inputMode="numeric" className="input" {...register('cost')} />
              {errors.cost && <p className="field-error">{errors.cost.message}</p>}
            </div>
            <div>
              <label htmlFor="performed_by" className="label">Teknisi / vendor</label>
              <input id="performed_by" className="input" {...register('performed_by')} />
              {errors.performed_by && <p className="field-error">{errors.performed_by.message}</p>}
            </div>
          </div>
          {item.interval_days && (
            <label className="flex min-h-[44px] items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-800 dark:bg-brand-900/30">
              <input type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-brand-700" {...register('schedule_next')} />
              <span>
                Jadwalkan servis berikutnya otomatis
                {nextDate && <b className="block">pada {formatDate(nextDate)} (tiap {item.interval_days} hari)</b>}
              </span>
            </label>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary flex-1" disabled={complete.isPending}>
              {complete.isPending && <Loader2 size={18} className="animate-spin" />} Simpan
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
