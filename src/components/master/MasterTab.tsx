import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Database, Loader2, Pencil, Plus, Search, SearchX, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  MASTER_PAGE_SIZE, fetchMasterUsage, useMasterDelete, useMasterPage, useMasterSave, useMasterUsage,
  type ActiveFilter, type MasterFilters,
} from '@/hooks/useMaster'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { errorMessage } from '@/lib/errors'
import { cleanSearch } from '@/lib/loans'
import { inUse, usageText, type Usage } from '@/lib/master'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import MasterForm from './MasterForm'
import { cleanValues, type TabDef } from './masterConfig'

type Row = Record<string, unknown>
interface DeleteState { row: Row; usage: Usage }

/** Isi satu tab. Dibuat ulang (key) tiap pindah tab, jadi pencarian, halaman, dan formulir tidak bocor antar data. */
export default function MasterTab({ tab }: { tab: TabDef }) {
  const toast = useToast()
  const qc = useQueryClient()
  const { can } = useAuth()
  const canDelete = can('admin')
  const isEmployee = tab.key === 'employees'

  const [searchInput, setSearchInput] = useState('')
  const q = useDebouncedValue(cleanSearch(searchInput), 350)
  const [active, setActive] = useState<ActiveFilter>('')
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [q, active])
  const filters: MasterFilters = { q, active }
  const filtered = !!(q || active)

  const list = useMasterPage(tab.table, page, filters)
  const usage = useMasterUsage(tab.table)
  const save = useMasterSave(tab.table)
  const del = useMasterDelete(tab.table)

  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [pending, setPending] = useState<DeleteState | null>(null)
  const [checking, setChecking] = useState<string | null>(null)

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const title = (r: Row) => String(r[tab.titleKey])
  const clearAll = () => { setSearchInput(''); setActive('') }

  const submit = async (values: Row) => {
    try {
      const id = editing && editing !== 'new' ? String(editing.id) : undefined
      await save.mutateAsync({ id, values: cleanValues(values) })
      toast.success(id ? 'Perubahan disimpan.' : `Data ${tab.singular} ditambahkan.`)
      setEditing(null) // ditutup HANYA setelah berhasil; jika gagal, isian tetap ada
    } catch (e) {
      toast.error(errorMessage(e, 'Data gagal disimpan.'))
    }
  }

  // Periksa pemakaian ke database (jumlah segar, bukan cache) sebelum menawarkan hapus
  const startDelete = async (row: Row) => {
    if (checking) return
    setChecking(String(row.id))
    try {
      const map = await qc.fetchQuery({ queryKey: ['master', 'usage', tab.table], queryFn: () => fetchMasterUsage(tab.table), staleTime: 0 })
      setPending({ row, usage: map[String(row.id)] ?? { assets: 0, loans: 0 } })
    } catch {
      toast.error('Tidak dapat memeriksa pemakaian data. Periksa koneksi lalu coba lagi.')
    } finally {
      setChecking(null)
    }
  }

  const confirmDelete = async () => {
    if (!pending) return
    try {
      await del.mutateAsync(String(pending.row.id))
      toast.success('Data dihapus.')
    } catch (e) {
      toast.error(errorMessage(e, 'Data gagal dihapus.'))
    } finally {
      setPending(null)
    }
  }

  const deactivate = async () => {
    if (!pending) return
    try {
      await save.mutateAsync({ id: String(pending.row.id), values: { is_active: false } })
      toast.success('Pegawai dinonaktifkan.')
    } catch (e) {
      toast.error(errorMessage(e, 'Gagal menonaktifkan.'))
    } finally {
      setPending(null)
    }
  }

  const blocked = pending && inUse(pending.usage)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card space-y-3 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              className="input !px-10"
              placeholder={tab.searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label={`Cari ${tab.singular}`}
            />
            <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {list.isFetching && <Loader2 size={16} className="animate-spin text-slate-500" aria-label="Memuat" />}
              {searchInput && (
                <button type="button" onClick={() => setSearchInput('')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Hapus pencarian">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
          {isEmployee && (
            <select className="input sm:w-44" value={active} onChange={(e) => setActive(e.target.value as ActiveFilter)} aria-label="Filter status pegawai">
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          )}
          <button className="btn-primary whitespace-nowrap" onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" /> {tab.addLabel}</button>
        </div>
      </div>

      {/* Daftar */}
      {list.isError ? (
        <ErrorMessage message={`Data ${tab.singular} gagal dimuat. Periksa koneksi internet Anda.`} onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label={`Memuat ${tab.singular}`}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-8 text-center">
          <span className="mb-3 rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{filtered ? <SearchX size={26} aria-hidden="true" /> : <Database size={26} aria-hidden="true" />}</span>
          <h2 className="text-base font-semibold">{filtered ? 'Data tidak ditemukan.' : tab.emptyText}</h2>
          {filtered
            ? <button className="btn-secondary mt-4" onClick={clearAll}>Hapus pencarian</button>
            : <button className="btn-primary mt-4" onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" /> {tab.addLabel}</button>}
        </div>
      ) : (
        <div className={list.isFetching ? 'opacity-70 transition-opacity motion-reduce:transition-none' : ''}>
          <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((r) => {
              const u = usage.data?.[String(r.id)]
              const used = inUse(u)
              const sub = isEmployee ? [r.employee_number, r.position].filter(Boolean).join(' · ') : String(r.description ?? '')
              return (
                <li key={String(r.id)} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">
                      {title(r)}
                      {r.is_active === false && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 align-middle text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Nonaktif</span>}
                    </p>
                    {sub && <p className="line-clamp-2 break-words text-xs text-slate-600 dark:text-slate-400">{sub}</p>}
                    {used && u && <p className="mt-0.5 text-xs font-medium text-brand-800 dark:text-brand-300">Dipakai {usageText(u)}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button className="btn-ghost min-w-[44px] !px-0" onClick={() => setEditing(r)} aria-label={`Ubah ${title(r)}`} title="Ubah"><Pencil size={18} aria-hidden="true" /></button>
                    {canDelete && (
                      <button
                        className="btn-ghost min-w-[44px] !px-0 text-red-700 dark:text-red-400"
                        onClick={() => void startDelete(r)}
                        disabled={checking !== null}
                        aria-label={used ? `Hapus ${title(r)} (sedang dipakai)` : `Hapus ${title(r)}`}
                        title="Hapus"
                      >
                        {checking === String(r.id) ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-4"><Pagination page={page} pageSize={MASTER_PAGE_SIZE} total={total} onChange={setPage} /></div>
        </div>
      )}

      {/* Tambah / ubah */}
      <Modal open={editing !== null} onClose={() => { if (!save.isPending) setEditing(null) }} title={editing === 'new' ? tab.addLabel : `Ubah ${tab.singular}`}>
        {editing !== null && (
          <MasterForm
            key={editing === 'new' ? 'new' : String(editing.id)}
            tab={tab}
            initial={editing === 'new' ? tab.empty : Object.fromEntries(Object.keys(tab.empty).map((k) => [k, (editing as Row)[k] ?? (typeof tab.empty[k] === 'boolean' ? true : '')]))}
            saving={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Masih dipakai: tidak dihapus, tawarkan alternatif yang aman */}
      <Modal
        open={!!blocked}
        onClose={() => setPending(null)}
        title="Tidak dapat dihapus"
        footer={
          <>
            <button className="btn-secondary flex-1" onClick={() => setPending(null)}>Tutup</button>
            {isEmployee && pending?.row.is_active !== false && (
              <button className="btn-primary flex-1" onClick={() => void deactivate()} disabled={save.isPending}>
                {save.isPending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Nonaktifkan pegawai
              </button>
            )}
          </>
        }
      >
        {pending && blocked && (
          <div className="space-y-2 text-sm">
            <p>
              <b>{title(pending.row)}</b> masih dipakai oleh <b>{usageText(pending.usage)}</b>. Data yang masih dipakai tidak dihapus supaya aset dan riwayatnya tetap utuh.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {isEmployee
                ? pending.row.is_active === false
                  ? 'Pegawai ini sudah nonaktif, sehingga tidak muncul di pilihan baru.'
                  : 'Anda dapat menonaktifkan pegawai ini agar tidak muncul di pilihan baru, tanpa menghapus riwayatnya.'
                : `Pindahkan aset tersebut ke ${tab.singular} lain terlebih dahulu. Jika hanya salah nama, gunakan Ubah.`}
            </p>
          </div>
        )}
      </Modal>

      {/* Aman dihapus: konfirmasi eksplisit */}
      <ConfirmDialog
        open={!!pending && !blocked}
        danger
        title={`Hapus ${tab.singular}?`}
        message={pending ? `"${title(pending.row)}" belum dipakai oleh aset atau peminjaman mana pun dan akan dihapus permanen.` : ''}
        confirmLabel="Ya, hapus"
        loading={del.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
