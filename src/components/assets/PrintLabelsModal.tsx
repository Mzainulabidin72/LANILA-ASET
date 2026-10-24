import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import QrLabel from './QrLabel'

interface Props { open: boolean; onClose: () => void; assetId: string; code: string; name: string }

export default function PrintLabelsModal({ open, onClose, assetId, code, name }: Props) {
  const [copies, setCopies] = useState(1)
  const safeCopies = Math.min(24, Math.max(1, copies || 1))

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Cetak Label QR"
        footer={
          <>
            <button className="btn-secondary flex-1" onClick={onClose}>Tutup</button>
            <button className="btn-primary flex-1" onClick={() => window.print()}><Printer size={18} /> Cetak</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="overflow-x-auto"><QrLabel assetId={assetId} code={code} name={name} /></div>
          <div>
            <label htmlFor="copies" className="label">Jumlah salinan (maks 24)</label>
            <input
              id="copies"
              type="number"
              min={1}
              max={24}
              inputMode="numeric"
              className="input"
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Tip: di dialog cetak, pilih ukuran kertas stiker/label atau A4, lalu atur skala 100%.</p>
        </div>
      </Modal>

      {/* Area cetak: di-portal ke <body>; saat print, #root disembunyikan (lihat index.css) */}
      {open &&
        createPortal(
          <div id="print-area" className="hidden print:block">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4mm' }}>
              {Array.from({ length: safeCopies }).map((_, i) => (
                <QrLabel key={i} assetId={assetId} code={code} name={name} />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
