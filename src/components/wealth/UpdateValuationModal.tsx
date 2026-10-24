import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useSaveAsset, type AssetWithRefs } from '@/hooks/useAssets'
import { errorMessage } from '@/lib/errors'
import { QUEUED_MSG } from '@/lib/offline/messages'
import { parseDecimal, todayLocal } from '@/lib/wealth/form'
import { GAIN_CLASSES } from '@/types/wealth'

interface Props { asset: AssetWithRefs; open: boolean; onClose: () => void }

const PRICE_LABEL: Record<string, string> = { stock: 'Harga terkini per saham', fund: 'NAB / harga terkini per unit', crypto: 'Harga terkini per koin', gold: 'Harga terkini per gram' }
const VALUE_LABEL: Record<string, string> = { cash: 'Saldo terbaru', deposit: 'Nilai terkini (termasuk bunga)' }

/** Perbarui harga / saldo / estimasi nilai secara manual. Setiap pembaruan tercatat di riwayat nilai. */
export default function UpdateValuationModal({ asset, open, onClose }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const save = useSaveAsset()
  const priceMode = GAIN_CLASSES.includes(asset.asset_class)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [fx, setFx] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const foreign = asset.currency !== 'IDR'

  useEffect(() => {
    if (!open) return
    const cur = priceMode ? asset.current_unit_price : asset.current_value
    setAmount(cur === null || cur === undefined ? '' : String(cur))
    setDate(todayLocal())
    setFx(asset.fx_rate ? String(asset.fx_rate) : '')
    setNote('')
    setError(null)
  }, [open, asset, priceMode])

  const label = priceMode ? PRICE_LABEL[asset.asset_class] : (VALUE_LABEL[asset.asset_class] ?? 'Estimasi nilai saat ini')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = parseDecimal(amount)
    if (n === null) return setError('Isi dengan angka (mis. 1500000 atau 1500,50), tanpa titik pemisah ribuan.')
    if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(amount.trim())) return setError('Tulis angka tanpa titik pemisah ribuan (mis. 1500000).')
    if (date > todayLocal()) return setError('Tanggal tidak boleh di masa depan.')
    const rate = foreign ? parseDecimal(fx) : null
    if (foreign && (rate === null || rate <= 0)) return setError('Kurs ke IDR wajib diisi untuk mata uang asing.')
    if (note.length > 300) return setError('Catatan maksimal 300 karakter.')

    const row: Record<string, unknown> = {
      [priceMode ? 'current_unit_price' : 'current_value']: n,
      valued_at: new Date(`${date}T12:00:00`).toISOString(),
      valuation_source: 'manual',
      valuation_note: note.trim() || null,
    }
    if (foreign) row.fx_rate = rate
    try {
      const r = await save.mutateAsync({ id: asset.id, row, label: `Perbarui nilai: ${asset.name}`, userId: user?.id })
      toast.success(r.queued ? QUEUED_MSG : 'Nilai berhasil diperbarui.')
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Nilai gagal disimpan.'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Perbarui Nilai">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Nilai diisi manual dan dicatat sebagai &quot;Diisi manual&quot;. Aplikasi tidak mengambil harga pasar otomatis.
        </p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</p>}
        <div>
          <label htmlFor="uv-amount" className="label">{label} ({asset.currency}) *</label>
          <input id="uv-amount" className="input !min-h-[48px]" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="uv-date" className="label">Per tanggal</label>
            <input id="uv-date" type="date" className="input !min-h-[48px]" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
          </div>
          {foreign && (
            <div>
              <label htmlFor="uv-fx" className="label">Kurs ke IDR *</label>
              <input id="uv-fx" className="input !min-h-[48px]" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="uv-note" className="label">Catatan sumber (opsional)</label>
          <input id="uv-note" className="input !min-h-[48px]" placeholder="mis. harga penutupan dari aplikasi sekuritas" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Batal</button>
          <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>
            {save.isPending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Simpan
          </button>
        </div>
      </form>
    </Modal>
  )
}
