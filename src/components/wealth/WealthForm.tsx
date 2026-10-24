import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, type FieldErrors, type FieldValues, type Resolver } from 'react-hook-form'
import { Loader2, Lock } from 'lucide-react'
import PhotoPicker from '@/components/assets/PhotoPicker'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useLookups } from '@/hooks/useAssets'
import { fieldsFor, validate, type FieldDef } from '@/lib/wealth/form'
import { CLASS_LABEL, CURRENCIES, FINANCIAL_CLASSES, isPhysical, type AssetClass } from '@/types/wealth'

interface Props {
  cls: AssetClass
  initial: Record<string, string>
  existingPhotoPath: string | null
  submitting: boolean
  cancelTo: string
  isEdit: boolean
  onSubmit: (values: Record<string, string>, photo: { file: File | null; removed: boolean }) => void
}

export default function WealthForm({ cls, initial, existingPhotoPath, submitting, cancelTo, isEdit, onSubmit }: Props) {
  const toast = useToast()
  const { can } = useAuth()
  const lookups = useLookups()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)

  const resolver: Resolver<FieldValues> = async (values) => {
    const errs = validate(cls, values as Record<string, string>)
    if (Object.keys(errs).length === 0) return { values, errors: {} }
    const errors: FieldErrors<FieldValues> = {}
    for (const [k, message] of Object.entries(errs)) (errors as Record<string, unknown>)[k] = { type: 'validate', message }
    return { values: {}, errors }
  }

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FieldValues>({ defaultValues: initial, resolver })
  const currency = (watch('currency') as string) || 'IDR'
  const fields = fieldsFor(cls, { currency })
  const physical = isPhysical(cls)
  const showCurrency = !['valuable', 'other', 'vehicle'].includes(cls)
  const canShare = can('admin', 'staff')

  const masterOptions = (src: NonNullable<FieldDef['master']>) =>
    src === 'categories' ? lookups.categories.map((c) => ({ value: c.id, label: c.name }))
      : src === 'locations' ? lookups.locations.map((l) => ({ value: l.id, label: l.name }))
        : lookups.employees.map((e) => ({ value: e.id, label: e.full_name }))

  const err = (key: string) => errors[key]?.message as string | undefined

  const control = (fd: FieldDef) => {
    const id = `f-${fd.key}`
    const common = {
      id,
      className: 'input !min-h-[48px] aria-[invalid=true]:border-red-500',
      'aria-invalid': !!err(fd.key),
      'aria-describedby': err(fd.key) ? `${id}-err` : fd.help ? `${id}-help` : undefined,
    }
    switch (fd.kind) {
      case 'textarea':
        return <textarea {...common} rows={3} className="input !py-2.5 aria-[invalid=true]:border-red-500" {...register(fd.key)} />
      case 'date':
        return <input {...common} type="date" {...register(fd.key)} />
      case 'select':
        return (
          <select {...common} {...register(fd.key)}>
            {fd.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'master':
        return (
          <select {...common} {...register(fd.key)}>
            <option value="">— Pilih —</option>
            {masterOptions(fd.master!).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'money':
      case 'decimal':
      case 'percent':
        return <input {...common} type="text" inputMode="decimal" autoComplete="off" placeholder={fd.placeholder} {...register(fd.key)} />
      case 'last4':
        return <input {...common} type="text" maxLength={4} autoComplete="off" spellCheck={false} placeholder="mis. 7890" {...register(fd.key)} />
      default:
        return <input {...common} type="text" placeholder={fd.placeholder} {...register(fd.key)} />
    }
  }

  const renderField = (fd: FieldDef) => (
    <div key={fd.key} className={fd.full ? 'sm:col-span-2' : ''}>
      <label htmlFor={`f-${fd.key}`} className="label">{fd.label}{fd.required ? ' *' : ''}</label>
      {control(fd)}
      {err(fd.key) ? <p id={`f-${fd.key}-err`} className="field-error">{err(fd.key)}</p>
        : fd.help ? <p id={`f-${fd.key}-help`} className="mt-1 text-xs text-slate-600 dark:text-slate-400">{fd.help}</p> : null}
    </div>
  )

  const nameIdx = fields.findIndex((x) => x.key === 'name')

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v as Record<string, string>, { file: photoFile, removed: photoRemoved }))} className="space-y-5" noValidate>
      <div className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {fields.slice(0, nameIdx + 1).map(renderField)}

        {showCurrency && (
          <div>
            <label htmlFor="f-currency" className="label">Mata uang</label>
            <select id="f-currency" className="input !min-h-[48px]" {...register('currency')}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {err('currency') && <p className="field-error">{err('currency')}</p>}
          </div>
        )}

        {fields.slice(nameIdx + 1).map(renderField)}

        {physical && (
          <div className="sm:col-span-2">
            <label htmlFor="f-visibility" className="label">Siapa yang bisa melihat</label>
            <select id="f-visibility" className="input !min-h-[48px]" {...register('visibility')}>
              <option value="private">Pribadi: hanya saya</option>
              <option value="shared" disabled={!canShare}>Bersama (inventaris): terlihat Admin/Staf/Viewer sesuai role</option>
            </select>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Aset bersama bisa dipinjamkan, dijadwalkan perawatan, dan dicetak label QR-nya oleh Admin/Staf.
              {!canShare && ' Hanya Admin/Staf yang dapat membuat aset bersama.'}
            </p>
          </div>
        )}
      </div>

      {physical && (
        <div className="card p-4 sm:p-5">
          <PhotoPicker existingPath={existingPhotoPath} file={photoFile} removed={photoRemoved} onFile={setPhotoFile} onRemove={setPhotoRemoved} onError={toast.error} />
        </div>
      )}

      {FINANCIAL_CLASSES.includes(cls) && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Aset keuangan bersifat pribadi: hanya Anda yang bisa melihatnya. Jangan memasukkan kata sandi, PIN, CVV, seed phrase, atau private key. Semua nilai di sini diisi manual dan tidak terhubung ke data pasar.
        </p>
      )}

      <div className="flex gap-3">
        <Link to={cancelTo} className="btn-secondary flex-1">Batal</Link>
        <button type="submit" disabled={submitting} className="btn-primary flex-1">
          {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {isEdit ? 'Simpan Perubahan' : `Simpan ${CLASS_LABEL[cls]}`}
        </button>
      </div>
    </form>
  )
}
