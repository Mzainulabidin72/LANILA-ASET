import { useEffect, useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react'
import AssetPhoto from './AssetPhoto'

interface Props {
  existingPath: string | null
  file: File | null
  removed: boolean
  onFile: (f: File | null) => void
  onRemove: (removed: boolean) => void
  onError: (msg: string) => void
}

export default function PhotoPicker({ existingPath, file, removed, onFile, onRemove, onError }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return onError('File harus berupa gambar (JPG, PNG, atau WebP).')
    if (f.size > 15 * 1024 * 1024) return onError('Ukuran foto maksimal 15 MB.')
    onFile(f)
    onRemove(false)
  }

  const showExisting = !file && !removed && !!existingPath
  const hasPhoto = !!file || showExisting

  return (
    <div>
      <span className="label">Foto aset</span>
      <div className="flex items-start gap-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl">
          {preview ? (
            <img src={preview} alt="Pratinjau foto" className="h-28 w-28 rounded-2xl object-cover" />
          ) : showExisting ? (
            <AssetPhoto path={existingPath} alt="Foto aset" className="h-28 w-28" />
          ) : (
            <AssetPhoto path={null} alt="" className="h-28 w-28" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <button type="button" className="btn-secondary justify-start" onClick={() => cameraRef.current?.click()}>
            <Camera size={18} /> Ambil Foto
          </button>
          <button type="button" className="btn-secondary justify-start" onClick={() => galleryRef.current?.click()}>
            <ImageIcon size={18} /> Pilih dari Galeri
          </button>
          {hasPhoto && (
            <button type="button" className="btn-ghost justify-start text-red-600 dark:text-red-400" onClick={() => { onFile(null); onRemove(true) }}>
              <Trash2 size={18} /> Hapus Foto
            </button>
          )}
        </div>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Foto otomatis diperkecil sebelum diunggah.</p>
    </div>
  )
}
