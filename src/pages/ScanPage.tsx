import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { CameraOff, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

const READER_ID = 'qr-reader'

export default function ScanPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [state, setState] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorText, setErrorText] = useState('')
  const [manual, setManual] = useState('')
  const [looking, setLooking] = useState(false)
  const busy = useRef(false)

  /** Terima isi QR (tautan /assets/<id>) atau kode aset (mis. LAN-2026-00001). */
  const resolve = async (raw: string) => {
    if (busy.current) { setLooking(false); return }
    busy.current = true
    try {
      const text = raw.trim()
      const m = text.match(/\/assets\/([0-9a-fA-F-]{36})/)
      if (m) { navigate(`/assets/${m[1]}`); return }

      const { data, error } = await supabase.from('aset_assets').select('id').eq('asset_code', text.toUpperCase()).maybeSingle()
      if (error) throw error
      if (data) { navigate(`/assets/${data.id as string}`); return }
      toast.error('Aset tidak ditemukan. Pastikan QR atau kode benar.')
    } catch {
      toast.error('Gagal mencari aset. Periksa koneksi internet Anda.')
    } finally {
      setTimeout(() => { busy.current = false }, 2000) // cegah hasil scan beruntun
      setLooking(false)
    }
  }

  useEffect(() => {
    let scanner: Html5Qrcode | null = null
    let started = false
    let cancelled = false

    // Jeda singkat: menghindari start ganda akibat React StrictMode di mode dev
    const timer = setTimeout(async () => {
      try {
        scanner = new Html5Qrcode(READER_ID)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => { void resolve(decoded) },
          () => { /* frame tanpa QR: abaikan */ },
        )
        started = true
        if (cancelled) { await scanner.stop(); scanner.clear(); return }
        setState('scanning')
      } catch (e) {
        if (cancelled) return
        const msg = String(e)
        setErrorText(
          /permission|denied|notallowed/i.test(msg)
            ? 'Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser, lalu muat ulang halaman.'
            : /secure|https/i.test(msg)
              ? 'Kamera hanya bisa dipakai lewat HTTPS (atau localhost).'
              : 'Kamera tidak dapat dibuka. Anda tetap bisa memasukkan kode aset secara manual di bawah.',
        )
        setState('error')
      }
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (scanner && started) scanner.stop().then(() => scanner?.clear()).catch(() => { /* sudah berhenti */ })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Scan QR</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Arahkan kamera ke label QR pada aset.</p>
      </div>

      <div className="card overflow-hidden">
        <div id={READER_ID} className="w-full bg-slate-900" style={{ minHeight: state === 'error' ? 0 : 300 }} />
        {state === 'starting' && <p className="p-4 text-center text-sm text-slate-600 dark:text-slate-400">Membuka kamera… izinkan akses kamera jika diminta.</p>}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <CameraOff size={32} className="text-slate-600 dark:text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{errorText}</p>
          </div>
        )}
      </div>

      <form
        className="card space-y-3 p-4"
        onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { setLooking(true); void resolve(manual) } }}
      >
        <label htmlFor="manual" className="label">Atau masukkan kode aset</label>
        <div className="flex gap-2">
          <input id="manual" className="input font-mono uppercase" placeholder="LAN-2026-00001" value={manual} onChange={(e) => setManual(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={looking || !manual.trim()} aria-label="Cari aset"><Search size={18} /></button>
        </div>
      </form>
    </div>
  )
}
