import { QRCodeSVG } from 'qrcode.react'

export function assetQrValue(assetId: string): string {
  return `${window.location.origin}/assets/${assetId}`
}

interface Props { assetId: string; code: string; name: string; qrSize?: number }

/** Satu label QR: kode QR + kode aset + nama. Dipakai untuk pratinjau dan cetak. */
export default function QrLabel({ assetId, code, name, qrSize = 110 }: Props) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-dashed border-slate-400 bg-white p-2 text-black"
      style={{ width: '70mm', breakInside: 'avoid' }}
    >
      <div className="shrink-0 bg-white p-1">
        <QRCodeSVG value={assetQrValue(assetId)} size={qrSize} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Lanila Aset</p>
        <p className="font-mono text-sm font-bold leading-tight">{code}</p>
        <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug">{name}</p>
      </div>
    </div>
  )
}
