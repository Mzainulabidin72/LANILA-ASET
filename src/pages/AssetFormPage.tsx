import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AssetForm from '@/components/assets/AssetForm'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset, useSaveAsset } from '@/hooks/useAssets'
import { errorMessage } from '@/lib/errors'
import { EMPTY_ASSET_FORM, type AssetFormValues } from '@/lib/schemas'
import { PackageX } from 'lucide-react'

/** Satu halaman untuk Tambah (/assets/new) dan Ubah (/assets/:id/edit). */
export default function AssetFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { data: asset, isLoading, isError, refetch } = useAsset(id)
  const save = useSaveAsset()

  const back = isEdit ? `/assets/${id}` : '/assets'

  const handleSubmit = async (values: AssetFormValues, photo: { file: File | null; removed: boolean }) => {
    try {
      const savedId = await save.mutateAsync({
        id,
        values,
        photoFile: photo.file,
        removePhoto: photo.removed,
        oldPhotoPath: asset?.photo_path ?? null,
        userId: user?.id,
      })
      toast.success(isEdit ? 'Perubahan berhasil disimpan.' : 'Aset berhasil ditambahkan.')
      navigate(`/assets/${savedId}`, { replace: true })
    } catch (e) {
      toast.error(errorMessage(e, 'Aset gagal disimpan. Periksa isian Anda lalu coba lagi.'))
    }
  }

  const defaults: AssetFormValues = asset
    ? {
        name: asset.name,
        category_id: asset.category_id ?? '',
        brand: asset.brand ?? '',
        model: asset.model ?? '',
        serial_number: asset.serial_number ?? '',
        acquisition_date: asset.acquisition_date ?? '',
        acquisition_price: asset.acquisition_price ? String(Math.round(Number(asset.acquisition_price))) : '',
        location_id: asset.location_id ?? '',
        responsible_employee_id: asset.responsible_employee_id ?? '',
        condition: asset.condition,
        status: asset.status,
        notes: asset.notes ?? '',
      }
    : EMPTY_ASSET_FORM

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to={back} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
        <ArrowLeft size={18} /> Kembali
      </Link>
      <h1 className="text-2xl font-bold">{isEdit ? 'Ubah Aset' : 'Tambah Aset'}</h1>

      {isEdit && isLoading ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-96 w-full" /></div>
      ) : isEdit && isError ? (
        <ErrorMessage message="Data aset gagal dimuat." onRetry={() => refetch()} />
      ) : isEdit && !asset ? (
        <EmptyState icon={PackageX} title="Aset tidak ditemukan" description="Aset mungkin sudah dihapus permanen." />
      ) : (
        // key: pastikan form dibuat ulang saat data aset sudah termuat
        <AssetForm
          key={asset?.id ?? 'new'}
          defaultValues={defaults}
          existingPhotoPath={asset?.photo_path ?? null}
          submitting={save.isPending}
          cancelTo={back}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
