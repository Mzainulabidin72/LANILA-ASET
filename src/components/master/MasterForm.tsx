import { useForm, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import type { TabDef } from './masterConfig'

interface Props {
  tab: TabDef
  initial: Record<string, unknown>
  saving: boolean
  onSubmit: (v: Record<string, unknown>) => void
  onCancel: () => void
}

/** Satu formulir untuk ketiga jenis data; kolomnya mengikuti tab. Input dipertahankan jika penyimpanan gagal. */
export default function MasterForm({ tab, initial, saving, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FieldValues>({ resolver: zodResolver(tab.schema), defaultValues: initial })
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4" noValidate>
      {tab.fields.map((f, i) => (
        <div key={f.name}>
          {f.type === 'checkbox' ? (
            <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="h-5 w-5 rounded accent-brand-700" {...register(f.name)} /> {f.label}
            </label>
          ) : (
            <>
              <label htmlFor={`m-${f.name}`} className="label">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea id={`m-${f.name}`} rows={3} className="input !py-2.5" aria-invalid={!!errors[f.name]} autoFocus={i === 0} {...register(f.name)} />
              ) : (
                <input id={`m-${f.name}`} type={f.type ?? 'text'} className="input" placeholder={f.placeholder} aria-invalid={!!errors[f.name]} autoFocus={i === 0} {...register(f.name)} />
              )}
            </>
          )}
          {errors[f.name] && <p className="field-error" role="alert">{String(errors[f.name]?.message)}</p>}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel} disabled={saving}>Batal</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Simpan
        </button>
      </div>
    </form>
  )
}
