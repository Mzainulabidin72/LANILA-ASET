import { useState } from 'react'
import { useForm, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Database, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ZodTypeAny } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { useMasterDelete, useMasterList, useMasterSave, type MasterTable } from '@/hooks/useMaster'
import { employeeSchema, nameDescSchema } from '@/lib/schemas'
import { errorMessage } from '@/lib/errors'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface FieldDef { name: string; label: string; type?: 'text' | 'textarea' | 'tel' | 'email' | 'checkbox'; placeholder?: string }
interface TabDef {
  table: MasterTable
  label: string
  singular: string
  schema: ZodTypeAny
  fields: FieldDef[]
  titleKey: string
  subtitle: (row: Record<string, unknown>) => string
  empty: Record<string, unknown>
  deleteNote: string
}

const TABS: TabDef[] = [
  {
    table: 'aset_categories', label: 'Kategori', singular: 'kategori', schema: nameDescSchema, titleKey: 'name',
    fields: [{ name: 'name', label: 'Nama kategori *' }, { name: 'description', label: 'Keterangan', type: 'textarea' }],
    subtitle: (r) => String(r.description ?? ''),
    empty: { name: '', description: '' },
    deleteNote: 'Aset yang memakai kategori ini akan menjadi "tanpa kategori".',
  },
  {
    table: 'aset_locations', label: 'Lokasi', singular: 'lokasi', schema: nameDescSchema, titleKey: 'name',
    fields: [{ name: 'name', label: 'Nama lokasi *' }, { name: 'description', label: 'Keterangan', type: 'textarea' }],
    subtitle: (r) => String(r.description ?? ''),
    empty: { name: '', description: '' },
    deleteNote: 'Aset yang berada di lokasi ini akan menjadi "tanpa lokasi".',
  },
  {
    table: 'aset_employees', label: 'Pegawai', singular: 'pegawai', schema: employeeSchema, titleKey: 'full_name',
    fields: [
      { name: 'full_name', label: 'Nama lengkap *' },
      { name: 'employee_number', label: 'NIP / Nomor pegawai' },
      { name: 'position', label: 'Jabatan' },
      { name: 'phone', label: 'Telepon', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'is_active', label: 'Pegawai aktif', type: 'checkbox' },
    ],
    subtitle: (r) => [r.position, r.employee_number].filter(Boolean).join(' · '),
    empty: { full_name: '', employee_number: '', position: '', phone: '', email: '', is_active: true },
    deleteNote: 'Pegawai yang masih punya riwayat peminjaman tidak bisa dihapus. Nonaktifkan saja.',
  },
]

/** Nilai kosong dikirim sebagai null supaya kolom unik (mis. NIP) tidak bentrok antar baris kosong. */
function clean(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) out[k] = typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v
  return out
}

function MasterForm({ tab, initial, saving, onSubmit, onCancel }: {
  tab: TabDef
  initial: Record<string, unknown>
  saving: boolean
  onSubmit: (v: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FieldValues>({
    resolver: zodResolver(tab.schema),
    defaultValues: initial,
  })
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4" noValidate>
      {tab.fields.map((f) => (
        <div key={f.name}>
          {f.type === 'checkbox' ? (
            <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="h-5 w-5 rounded accent-brand-700" {...register(f.name)} /> {f.label}
            </label>
          ) : (
            <>
              <label htmlFor={f.name} className="label">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea id={f.name} rows={3} className="input !py-2.5" {...register(f.name)} />
              ) : (
                <input id={f.name} type={f.type ?? 'text'} className="input" placeholder={f.placeholder} {...register(f.name)} />
              )}
            </>
          )}
          {errors[f.name] && <p className="field-error">{String(errors[f.name]?.message)}</p>}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Batal</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving && <Loader2 size={18} className="animate-spin" />} Simpan
        </button>
      </div>
    </form>
  )
}

function MasterTab({ tab }: { tab: TabDef }) {
  const toast = useToast()
  const { can } = useAuth()
  const list = useMasterList<Record<string, unknown>>(tab.table)
  const save = useMasterSave(tab.table)
  const del = useMasterDelete(tab.table)
  const [editing, setEditing] = useState<Record<string, unknown> | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null)
  const isAdmin = can('admin')

  const submit = async (values: Record<string, unknown>) => {
    try {
      const id = editing && editing !== 'new' ? String(editing.id) : undefined
      await save.mutateAsync({ id, values: clean(values) })
      toast.success(id ? 'Perubahan disimpan.' : `Data ${tab.singular} ditambahkan.`)
      setEditing(null)
    } catch (e) {
      toast.error(errorMessage(e, 'Data gagal disimpan.'))
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(String(deleting.id))
      toast.success('Data dihapus.')
    } catch (e) {
      toast.error(errorMessage(e, 'Data gagal dihapus.'))
    } finally {
      setDeleting(null)
    }
  }

  const rows = list.data ?? []
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={18} /> Tambah {tab.singular}</button>
      </div>

      {list.isError ? (
        <ErrorMessage message="Data gagal dimuat." onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Database} title={`Belum ada ${tab.singular}`} description={`Tambahkan ${tab.singular} agar bisa dipilih saat mengisi data aset.`} />
      ) : (
        <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <li key={String(r.id)} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {String(r[tab.titleKey])}
                  {r.is_active === false && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">Nonaktif</span>}
                </p>
                {tab.subtitle(r) && <p className="truncate text-xs text-slate-600 dark:text-slate-400">{tab.subtitle(r)}</p>}
              </div>
              <button className="btn-ghost min-w-[44px] !px-0" onClick={() => setEditing(r)} aria-label={`Ubah ${String(r[tab.titleKey])}`}><Pencil size={18} /></button>
              {isAdmin && (
                <button className="btn-ghost min-w-[44px] !px-0 text-red-600 dark:text-red-400" onClick={() => setDeleting(r)} aria-label={`Hapus ${String(r[tab.titleKey])}`}><Trash2 size={18} /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? `Tambah ${tab.singular}` : `Ubah ${tab.singular}`}>
        {editing !== null && (
          <MasterForm
            key={editing === 'new' ? 'new' : String(editing.id)}
            tab={tab}
            initial={editing === 'new' ? tab.empty : Object.fromEntries(Object.keys(tab.empty).map((k) => [k, (editing as Record<string, unknown>)[k] ?? (typeof tab.empty[k] === 'boolean' ? true : '')]))}
            saving={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        danger
        title={`Hapus ${tab.singular}?`}
        message={`${deleting ? `"${String(deleting[tab.titleKey])}" ` : ''}akan dihapus permanen. ${tab.deleteNote}`}
        confirmLabel="Ya, hapus"
        loading={del.isPending}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

export default function MasterDataPage() {
  const [active, setActive] = useState(0)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Master Data</h1>
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/70 p-1 dark:bg-slate-800">
        {TABS.map((t, i) => (
          <button
            key={t.table}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`min-h-[44px] rounded-xl text-sm font-semibold transition ${active === i ? 'bg-white text-brand-800 shadow dark:bg-slate-900 dark:text-brand-200' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <MasterTab key={TABS[active].table} tab={TABS[active]} />
    </div>
  )
}
