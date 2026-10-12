import { supabase } from './supabase'
import { compressImage } from './image'

const BUCKET = 'aset-photos'

export async function uploadAssetPhoto(assetId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${assetId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await supabase.storage.from(BUCKET).remove(paths) // gagal hapus file lama tidak perlu menggagalkan proses
}

export async function getSignedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}
