/** Antrean perubahan offline, disimpan di IndexedDB (tahan tutup-buka aplikasi). Tanpa library tambahan. */

export type OpType =
  | 'asset.save'
  | 'asset.status'
  | 'loan.create'
  | 'loan.return'
  | 'maint.save'
  | 'maint.complete'
  | 'maint.cancel'

export interface OpInput {
  type: OpType
  /** teks yang ditampilkan di halaman Sinkronisasi */
  label: string
  payload: unknown
  /** foto aset (sudah dikompres) untuk 'asset.save' */
  photo?: Blob
}

export interface QueuedOp extends OpInput {
  id: string
  userId: string
  createdAt: number
  attempts: number
  status: 'pending' | 'failed'
  error?: string
}

const DB_NAME = 'lanila-aset-offline'
const STORE = 'queue'
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('Penyimpanan offline tidak tersedia di browser ini.')); return }
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => { dbPromise = null; reject(req.error ?? new Error('Gagal membuka penyimpanan offline.')) }
    })
  }
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

export async function listOps(): Promise<QueuedOp[]> {
  const all = await run<QueuedOp[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedOp[]>)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export const putOp = (op: QueuedOp) => run('readwrite', (s) => s.put(op)).then(() => undefined)
export const deleteOp = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined)

/** Error karena jaringan (boleh dicoba lagi nanti), bukan karena data ditolak server. */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const msg = (e as { message?: string } | null)?.message ?? String(e)
  return e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(msg)
}
