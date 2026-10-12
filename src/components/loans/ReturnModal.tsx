import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useReturnLoan, type LoanWithRefs } from '@/hooks/useLoans'
import { todayISO } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { makeReturnSchema, type ReturnFormValues } from '@/lib/schemasOps'
import { CONDITION_LABEL } from '@/types/database'

interface Props { loan: LoanWithRefs | null; onClose: () => void }

export default function ReturnModal({ loan, onClose }: Props) {
  const toast = useToast()
  const ret = useReturnLoan()
  const schema = useMemo(() => makeReturnSchema(loan?.loan_date ?? '1970-01-01'), [loan?.loan_date])
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReturnFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { return_date: todayISO(), condition_in: 'baik', notes: '' },
  })

  useEffect(() => {
    if (loan) reset({ return_date: todayISO(), condition_in: loan.condition_out ?? 'baik', notes: '' })
  }, [loan, reset])

  const submit = async (v: ReturnFormValues) => {
    if (!loan) return
    const extra = v.notes.trim()
    const notes = extra ? [loan.notes, `Pengembalian: ${extra}`].filter(Boolean).join('\n') : loan.notes
    try {
      await ret.mutateAsync({ id: loan.id, return_date: v.return_date, condition_in: v.condition_in, notes })
      toast.success('Aset berhasil dikembalikan.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, 'Pengembalian gagal disimpan.'))
    }
  }

  return (
    <Modal open={!!loan} onClose={onClose} title="Kembalikan Aset">
      {loan && (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-semibold">{loan.asset?.name}</p>
            <p className="font-mono text-xs text-slate-500">{loan.asset?.asset_code}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Dipinjam {loan.employee?.full_name ?? '-'} sejak {formatDate(loan.loan_date)}
            </p>
          </div>
          <div>
            <label htmlFor="return_date" className="label">Tanggal kembali *</label>
            <input id="return_date" type="date" className="input" {...register('return_date')} />
            {errors.return_date && <p className="field-error">{errors.return_date.message}</p>}
          </div>
          <div>
            <label htmlFor="condition_in" className="label">Kondisi saat dikembalikan</label>
            <select id="condition_in" className="input" {...register('condition_in')}>
              {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Kondisi aset akan ikut diperbarui sesuai pilihan ini.</p>
          </div>
          <div>
            <label htmlFor="ret_notes" className="label">Catatan pengembalian</label>
            <textarea id="ret_notes" rows={2} className="input !py-2.5" {...register('notes')} />
            {errors.notes && <p className="field-error">{errors.notes.message}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary flex-1" disabled={ret.isPending}>
              {ret.isPending && <Loader2 size={18} className="animate-spin" />} Simpan
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
