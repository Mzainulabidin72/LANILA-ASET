import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { assetFormSchema, type AssetFormValues } from '@/lib/schemas'
import { CONDITION_LABEL, STATUS_LABEL } from '@/types/database'
import { useLookups } from '@/hooks/useAssets'
import PhotoPicker from './PhotoPicker'
import { useToast } from '@/components/ui/Toast'

interface Props {
  defaultValues: AssetFormValues
  existingPhotoPath: string | null
  submitting: boolean
  cancelTo: string
  onSubmit: (values: AssetFormValues, photo: { file: File | null; removed: boolean }) => void
}

export default function AssetForm({ defaultValues, existingPhotoPath, submitting, cancelTo, onSubmit }: Props) {
  const toast = useToast()
  const { categories, locations, employees } = useLookups()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
  })
  const loanedNow = defaultValues.status === 'dipinjam'

  const err = (name: keyof AssetFormValues) => errors[name] && <p className="field-error">{errors[name]?.message}</p>

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v, { file: photoFile, removed: photoRemoved }))} className="space-y-6" noValidate>
      <div className="card p-4 sm:p-5">
        <PhotoPicker
          existingPath={existingPhotoPath}
          file={photoFile}
          removed={photoRemoved}
          onFile={setPhotoFile}
          onRemove={setPhotoRemoved}
          onError={toast.error}
        />
      </div>

      <div className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="label">Nama aset *</label>
          <input id="name" className="input" placeholder="mis. Laptop Dell Latitude 5440" {...register('name')} />
          {err('name')}
        </div>
        <div>
          <label htmlFor="category_id" className="label">Kategori</label>
          <select id="category_id" className="input" {...register('category_id')}>
            <option value="">— Pilih kategori —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="location_id" className="label">Lokasi</label>
          <select id="location_id" className="input" {...register('location_id')}>
            <option value="">— Pilih lokasi —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="brand" className="label">Merek</label>
          <input id="brand" className="input" {...register('brand')} />
          {err('brand')}
        </div>
        <div>
          <label htmlFor="model" className="label">Model</label>
          <input id="model" className="input" {...register('model')} />
          {err('model')}
        </div>
        <div>
          <label htmlFor="serial_number" className="label">Nomor seri</label>
          <input id="serial_number" className="input" {...register('serial_number')} />
          {err('serial_number')}
        </div>
        <div>
          <label htmlFor="responsible_employee_id" className="label">Penanggung jawab</label>
          <select id="responsible_employee_id" className="input" {...register('responsible_employee_id')}>
            <option value="">— Pilih pegawai —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="acquisition_date" className="label">Tanggal perolehan</label>
          <input id="acquisition_date" type="date" className="input" {...register('acquisition_date')} />
          {err('acquisition_date')}
        </div>
        <div>
          <label htmlFor="acquisition_price" className="label">Harga perolehan (Rp)</label>
          <input id="acquisition_price" inputMode="numeric" className="input" placeholder="15000000" {...register('acquisition_price')} />
          {err('acquisition_price')}
        </div>
        <div>
          <label htmlFor="condition" className="label">Kondisi</label>
          <select id="condition" className="input" {...register('condition')}>
            {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" className="input" disabled={loanedNow} {...register('status')}>
            {Object.entries(STATUS_LABEL)
              .filter(([k]) => k !== 'dipinjam' || loanedNow)
              .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {loanedNow && <p className="mt-1 text-xs text-slate-500">Status "Dipinjam" berubah otomatis lewat menu Peminjaman.</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="label">Catatan</label>
          <textarea id="notes" rows={3} className="input !py-2.5" {...register('notes')} />
          {err('notes')}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Kategori, lokasi, atau pegawai belum ada? Tambahkan dulu di menu <Link to="/master" className="font-semibold text-brand-700 underline dark:text-brand-300">Master Data</Link>.
      </p>

      <div className="flex gap-3">
        <Link to={cancelTo} className="btn-secondary flex-1">Batal</Link>
        <button type="submit" disabled={submitting} className="btn-primary flex-1">
          {submitting && <Loader2 size={18} className="animate-spin" />}
          Simpan
        </button>
      </div>
    </form>
  )
}
