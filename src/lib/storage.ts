import { supabase } from './supabase'
import { compressImage } from './image'

const BUCKET = 'aset-photos'
/** Foto disalin ke Cache API (kunci tetap per path) supaya tetap tampil saat offline. */
export const PHOTO_CACHE = 'aset-photo-blobs'

export async function uploadAssetPhotoBlob(assetId: string, blob: Blob): Promise<string> {
  const path = `${assetId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function uploadAssetPhoto(assetId: string, file: File): Promise<string> {
  return uploadAssetPhotoBlob(assetId, await compressImage(file))
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

async function openPhotoCache(): Promise<Cache | null> {
  try {
    return 'caches' in window ? await caches.open(PHOTO_CACHE) : null
  } catch {
    return null
  }
}

async function prune(cache: Cache) {
  const keys = await cache.keys()
  if (keys.length > 200) await Promise.all(keys.slice(0, 50).map((k) => cache.delete(k)))
}

/**
 * Ambil foto sebagai object URL. Urutan: cache lokal -> unduh (via signed URL) lalu simpan ke cache.
 * Path foto unik per unggahan, jadi cache tidak pernah basi.
 */
export async function getPhotoObjectUrl(path: string): Promise<string> {
  const cache = await openPhotoCache()
  const key = new Request(`/__photo/${path}`)
  const hit = cache ? await cache.match(key) : undefined
  if (hit) return URL.createObjectURL(await hit.blob())

  const res = await fetch(await getSignedPhotoUrl(path))
  if (!res.ok) throw new Error('Foto gagal dimuat')
  const blob = await res.blob()
  if (cache) {
    await cache.put(key, new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }))
    await prune(cache)
  }
  return URL.createObjectURL(blob)
}
