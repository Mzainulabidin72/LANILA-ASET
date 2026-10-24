import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, HandCoins, Lock, PackageX, Pencil, Printer, RefreshCw, RotateCcw, Users, Wrench } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset, useAssetAudit, useSetAssetStatus } from '@/hooks/useAssets'
import { formatDate, formatDateTime } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { QUEUED_MSG } from '@/lib/offline/messages'
import { averagePrice, computeValuation, isArchived, maskLast4 } from '@/lib/wealth/calc'
import { formatPercent, formatQuantity } from '@/lib/wealth/format'
import { CLASS_LABEL, GAIN_CLASSES, SOURCE_LABEL, isPhysical, type AssetClass } from '@/types/wealth'
import { CONDITION_LABEL } from '@/types/database'
import AssetPhoto from '@/components/assets/AssetPhoto'
import AuditTimeline from '@/components/assets/AuditTimeline'
import { AssetLoanHistory, AssetMaintenanceHistory } from '@/components/assets/AssetHistory'
import PrintLabelsModal from '@/components/assets/PrintLabelsModal'
import { assetQrValue } from '@/components/assets/QrLabel'
import { ConditionBadge } from '@/components/ui/Badges'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Money, { PrivacyToggle } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { BasisTag, GainCell } from '@/components/wealth/ValueParts'
import { CLASS_ICON } from '@/components/wealth/classMeta'
import UpdateValuationModal from '@/components/wealth/UpdateValuationModal'
import ValuationHistory from '@/components/wealth/ValuationHistory'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{children || '-'}</dd>
    </div>
  )
}

const QTY_UNIT: Partial<Record<AssetClass, string>> = { stock: 'lembar', fund: 'unit', gold: 'gram' }

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { can, user } = useAuth()
  const { data: asset, isLoading, isError, refetch } = useAsset(id)
  const setStatus = useSetAssetStatus()
  const [printOpen, setPrintOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [valuationOpen, setValuationOpen] = useState(false)

  const physical = isPhysical(asset?.asset_class)
  const canWrite = !!asset && (asset.visibility === 'private' ? asset.owner_id === user?.id : can('admin', 'staff'))
  const canSeeAudit = !!asset && physical && asset.visibility === 'shared' && can('admin', 'staff')
  const audit = useAssetAudit(id, canSeeAudit)

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-72 w-full" /></div>
  if (isError) return <ErrorMessage message="Detail aset gagal dimuat." onRetry={() => refetch()} />
  if (!asset) {
    return (
      <EmptyState icon={PackageX} title="Aset tidak ditemukan" description="Kode QR atau tautan ini tidak cocok dengan aset yang bisa Anda lihat."
        action={<Link to="/assets" className="btn-primary">Ke Aset Saya</Link>} />
    )
  }

  const cls = asset.asset_class
  const v = computeValuation(asset)
  const Icon = CLASS_ICON[cls]
  const archived = isArchived(asset.status)
  const extra = asset.extra ?? {}
  const avg = averagePrice(Number(asset.acquisition_price), asset.fees === null ? null : Number(asset.fees), asset.quantity === null ? null : Number(asset.quantity))
  const marketBased = GAIN_CLASSES.includes(cls)
  const e = (k: string) => (extra[k] as string | undefined) ?? ''

  const changeStatus = async (status: 'dihapus' | 'aktif') => {
    try {
      const r = await setStatus.mutateAsync({ id: asset.id, status, name: asset.name })
      toast.success(r.queued ? QUEUED_MSG : status === 'dihapus' ? 'Aset diarsipkan.' : 'Aset dipulihkan.')
      setConfirmArchive(false)
      if (status === 'dihapus') navigate('/assets', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
      setConfirmArchive(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link to="/assets" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"><ArrowLeft size={18} /> Aset Saya</Link>
        <PrivacyToggle />
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon size={24} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">{CLASS_LABEL[cls]}{asset.symbol ? ` · ${asset.symbol}` : ''}</p>
            <h1 className="text-xl font-bold sm:text-2xl">{asset.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${asset.visibility === 'private' ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'}`}>
                {asset.visibility === 'private' ? <Lock size={12} aria-hidden="true" /> : <Users size={12} aria-hidden="true" />}
                {asset.visibility === 'private' ? 'Pribadi' : 'Bersama'}
              </span>
              {archived && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Diarsipkan</span>}
              {physical && asset.status === 'dipinjam' && <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">Dipinjam</span>}
              {physical && asset.status === 'perawatan' && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Perawatan</span>}
              {physical && <ConditionBadge value={asset.condition} />}
            </div>
          </div>
        </div>
        {canWrite && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!archived && <button className="btn-primary" onClick={() => setValuationOpen(true)}><RefreshCw size={18} /> Perbarui Nilai</button>}
            <Link to={`/assets/${asset.id}/edit`} className="btn-secondary"><Pencil size={18} /> Ubah</Link>
            {physical && asset.status === 'aktif' && can('admin', 'staff') && <Link to={`/loans?new=${asset.id}`} className="btn-secondary"><HandCoins size={18} /> Pinjamkan</Link>}
            {physical && !archived && can('admin', 'staff') && <Link to={`/maintenance?new=${asset.id}`} className="btn-secondary"><Wrench size={18} /> Jadwalkan Perawatan</Link>}
            {archived
              ? <button className="btn-secondary" onClick={() => changeStatus('aktif')} disabled={setStatus.isPending}><RotateCcw size={18} /> Pulihkan</button>
              : <button className="btn-secondary text-red-700 dark:text-red-400" onClick={() => setConfirmArchive(true)}><Archive size={18} /> Arsipkan</button>}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Valuasi */}
          <section className="card p-4 sm:p-5" aria-label="Valuasi">
            <h2 className="mb-3 text-sm font-semibold">Valuasi</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{cls === 'cash' ? 'Saldo saat ini' : 'Nilai saat ini'}</p>
                <p className="mt-0.5 text-2xl font-bold"><Money value={v.value} currency={v.currency} /></p>
                {v.currency !== 'IDR' && v.valueIdr !== null && <p className="text-xs text-slate-600 dark:text-slate-400">≈ <Money value={v.valueIdr} /> (kurs {asset.fx_rate})</p>}
                <div className="mt-1"><BasisTag v={v} /></div>
              </div>
              {cls !== 'cash' && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Harga perolehan</p>
                  <p className="mt-0.5 text-lg font-semibold"><Money value={v.cost} currency={v.currency} /></p>
                </div>
              )}
              {marketBased && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Untung/rugi belum terealisasi</p>
                  <div className="mt-0.5 text-lg"><GainCell v={v} /></div>
                  {v.gain === null && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Muncul setelah harga terkini diisi.</p>}
                </div>
              )}
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              {asset.valued_at
                ? `Sumber: ${SOURCE_LABEL[asset.valuation_source]} · diperbarui ${formatDate(asset.valued_at)}${asset.valuation_note ? ` · ${asset.valuation_note}` : ''}`
                : 'Belum ada nilai terkini yang dicatat.'}
            </p>
          </section>

          <ValuationHistory assetId={asset.id} currency={asset.currency} />

          {/* Informasi */}
          <section className="card p-4 sm:p-5">
            <h2 className="mb-1 text-sm font-semibold">Informasi Aset</h2>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <Row label="Institusi / platform">{asset.institution}</Row>
              {cls === 'cash' && <Row label="Jenis akun">{e('account_type')}</Row>}
              {cls === 'cash' && <Row label="Nomor rekening">{maskLast4(asset.account_last4)}</Row>}
              {cls === 'fund' && <Row label="Jenis produk">{e('product_type')}</Row>}
              {cls === 'stock' && <Row label="Bursa">{e('exchange')}</Row>}
              {cls === 'gold' && <Row label="Bentuk emas">{e('gold_form')}</Row>}
              {cls === 'gold' && <Row label="Kadar">{e('purity')}</Row>}
              {cls === 'gold' && <Row label="Penyimpanan">{e('storage')}</Row>}
              {asset.quantity !== null && <Row label={`Jumlah${QTY_UNIT[cls] ? ` (${QTY_UNIT[cls]})` : ''}`}>{formatQuantity(Number(asset.quantity))}</Row>}
              {avg !== null && <Row label="Harga beli rata-rata"><Money value={avg} currency={asset.currency} /></Row>}
              {asset.fees !== null && <Row label="Biaya transaksi"><Money value={Number(asset.fees)} currency={asset.currency} /></Row>}
              {asset.current_unit_price !== null && <Row label="Harga terkini"><Money value={Number(asset.current_unit_price)} currency={asset.currency} /></Row>}
              <Row label="Mata uang">{asset.currency}</Row>
              <Row label="Tanggal perolehan">{asset.acquisition_date ? formatDate(asset.acquisition_date) : ''}</Row>
              {asset.interest_rate !== null && <Row label="Suku bunga / kupon">{formatPercent(Number(asset.interest_rate)).replace('+', '')} / tahun</Row>}
              {asset.maturity_date && <Row label="Jatuh tempo">{formatDate(asset.maturity_date)}</Row>}
              {physical && <Row label="Kategori">{asset.category?.name}</Row>}
              {physical && <Row label="Merek / model">{[asset.brand, asset.model].filter(Boolean).join(' ')}</Row>}
              {physical && <Row label="Nomor seri / polisi / sertifikat">{asset.serial_number}</Row>}
              {physical && <Row label="Kondisi">{CONDITION_LABEL[asset.condition]}</Row>}
              {physical && <Row label="Lokasi">{asset.location?.name ?? e('location_text')}</Row>}
              {physical && <Row label="Penanggung jawab">{asset.employee?.full_name}</Row>}
              {e('ownership') && <Row label="Kepemilikan">{e('ownership')}</Row>}
              <Row label="Dibuat">{formatDateTime(asset.created_at)}</Row>
              <Row label="Terakhir diubah">{formatDateTime(asset.updated_at)}</Row>
            </dl>
            {asset.notes && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">Catatan</p>
                <p className="whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}
          </section>

          {physical && asset.visibility === 'shared' && <AssetLoanHistory assetId={asset.id} />}
          {physical && asset.visibility === 'shared' && <AssetMaintenanceHistory assetId={asset.id} />}
        </div>

        <div className="space-y-5">
          {physical && (
            <section className="card overflow-hidden">
              <AssetPhoto path={asset.photo_path} alt={asset.name} className="h-48 w-full !rounded-none" />
            </section>
          )}
          {physical && (
            <section className="card flex flex-col items-center p-5 text-center">
              <h2 className="mb-3 text-sm font-semibold">Kode QR</h2>
              <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
                <QRCodeSVG value={assetQrValue(asset.id)} size={160} level="M" bgColor="#ffffff" fgColor="#000000" />
              </div>
              <p className="mt-3 font-mono text-sm font-bold">{asset.asset_code}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Scan lewat menu Scan QR untuk membuka halaman ini.</p>
              {canWrite && <button className="btn-secondary mt-4 w-full" onClick={() => setPrintOpen(true)}><Printer size={18} /> Cetak Label</button>}
            </section>
          )}
          {canSeeAudit && (
            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold">Riwayat Perubahan</h2>
              {audit.isLoading ? <Skeleton className="h-24 w-full" />
                : audit.isError ? <p className="text-sm text-slate-600 dark:text-slate-400">Riwayat gagal dimuat.</p>
                : audit.data && audit.data.length > 0 ? <AuditTimeline logs={audit.data} />
                : <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada riwayat.</p>}
            </section>
          )}
        </div>
      </div>

      <UpdateValuationModal asset={asset} open={valuationOpen} onClose={() => setValuationOpen(false)} />
      {physical && <PrintLabelsModal open={printOpen} onClose={() => setPrintOpen(false)} assetId={asset.id} code={asset.asset_code} name={asset.name} />}
      <ConfirmDialog
        open={confirmArchive}
        danger
        title="Arsipkan aset ini?"
        message="Aset tidak lagi dihitung di total dan hilang dari daftar aktif. Riwayatnya tetap tersimpan dan Anda bisa memulihkannya kapan saja."
        confirmLabel="Ya, arsipkan"
        loading={setStatus.isPending}
        onConfirm={() => changeStatus('dihapus')}
        onClose={() => setConfirmArchive(false)}
      />
    </div>
  )
}
