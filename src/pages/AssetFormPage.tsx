import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, PackageX } from 'lucide-react'
import ClassPicker from '@/components/wealth/ClassPicker'
import WealthForm from '@/components/wealth/WealthForm'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset, useSaveAsset } from '@/hooks/useAssets'
import { errorMessage } from '@/lib/errors'
import { QUEUED_MSG } from '@/lib/offline/messages'
import { defaultValues, fromAsset, toRow } from '@/lib/wealth/form'
import { ASSET_CLASSES, CLASS_LABEL, type AssetClass } from '@/types/wealth'

const isClass = (x: string | null): x is AssetClass => !!x && (ASSET_CLASSES as readonly string[]).includes(x)

/** Tambah (/assets/new: pilih jenis dulu, lalu form menyesuaikan) dan Ubah (/assets/:id/edit). */
export default function AssetFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { data: asset, isLoading, isError, refetch } = useAsset(id)
  const save = useSaveAsset()
  const preset = search.get('class')
  const [picked, setPicked] = useState<AssetClass | null>(isClass(preset) ? preset : null)

  const back = isEdit ? `/assets/${id}` : '/assets'
  const cls: AssetClass | null = isEdit ? (asset?.asset_class ?? null) : picked

  const handleSubmit = async (values: Record<string, string>, photo: { file: File | null; removed: boolean }) => {
    if (!cls || !user) return
    try {
      const row = toRow(cls, values, { userId: user.id, existingValuedAt: asset?.valued_at ?? null })
      const saved = await save.mutateAsync({
        id,
        row,
        label: `${isEdit ? 'Ubah' : 'Tambah'} aset: ${String(row.name)}`,
        photoFile: photo.file,
        removePhoto: photo.removed,
        oldPhotoPath: asset?.photo_path ?? null,
        userId: user.id,
      })
      if (saved.queued) {
        toast.success(QUEUED_MSG)
        navigate(isEdit ? `/assets/${saved.id}` : '/assets', { replace: true }) // aset baru belum ada di server
        return
      }
      toast.success(isEdit ? 'Perubahan berhasil disimpan.' : 'Aset berhasil ditambahkan.')
      navigate(`/assets/${saved.id}`, { replace: true })
    } catch (e) {
      toast.error(errorMessage(e, 'Aset gagal disimpan. Periksa isian Anda lalu coba lagi.'))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to={back} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <ArrowLeft size={18} /> Kembali
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Ubah Aset' : 'Tambah Aset'}</h1>
        {cls && <p className="text-sm text-slate-600 dark:text-slate-400">{CLASS_LABEL[cls]}</p>}
      </div>

      {isEdit && isLoading ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-96 w-full" /></div>
      ) : isEdit && isError ? (
        <ErrorMessage message="Data aset gagal dimuat." onRetry={() => refetch()} />
      ) : isEdit && !asset ? (
        <EmptyState icon={PackageX} title="Aset tidak ditemukan" description="Aset mungkin sudah dihapus atau bukan milik Anda." />
      ) : !cls ? (
        <ClassPicker onPick={setPicked} />
      ) : (
        <>
          {!isEdit && (
            <button type="button" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300" onClick={() => setPicked(null)}>
              Ganti jenis aset
            </button>
          )}
          <WealthForm
            key={asset?.id ?? cls}
            cls={cls}
            initial={asset ? fromAsset(asset) : defaultValues(cls)}
            existingPhotoPath={asset?.photo_path ?? null}
            submitting={save.isPending}
            cancelTo={back}
            isEdit={isEdit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}
