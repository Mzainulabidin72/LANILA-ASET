import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, HandCoins, PackageX, Pencil, Printer, RotateCcw, Trash2, Wrench } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset, useAssetAudit, useSetAssetStatus } from '@/hooks/useAssets'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import AssetPhoto from '@/components/assets/AssetPhoto'
import AuditTimeline from '@/components/assets/AuditTimeline'
import { AssetLoanHistory, AssetMaintenanceHistory } from '@/components/assets/AssetHistory'
import PrintLabelsModal from '@/components/assets/PrintLabelsModal'
import { assetQrValue } from '@/components/assets/QrLabel'
import { ConditionBadge, StatusBadge } from '@/components/ui/Badges'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{children || '-'}</dd>
    </div>
  )
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const canEdit = can('admin', 'staff')
  const { data: asset, isLoading, isError, refetch } = useAsset(id)
  const audit = useAssetAudit(id, canEdit)
  const setStatus = useSetAssetStatus()
  const [printOpen, setPrintOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-64 w-full" /><Skeleton className="h-72 w-full" /></div>
  }
  if (isError) return <ErrorMessage message="Detail aset gagal dimuat." onRetry={() => refetch()} />
  if (!asset) {
    return (
      <EmptyState
        icon={PackageX}
        title="Aset tidak ditemukan"
        description="Kode QR atau tautan ini tidak cocok dengan aset mana pun."
        action={<Link to="/assets" className="btn-primary">Ke Daftar Aset</Link>}
      />
    )
  }

  const isDeleted = asset.status === 'dihapus'

  const changeStatus = async (status: 'dihapus' | 'aktif') => {
    try {
      await setStatus.mutateAsync({ id: asset.id, status })
      toast.success(status === 'dihapus' ? 'Aset dipindahkan ke status Dihapus.' : 'Aset berhasil dipulihkan.')
      setConfirmDelete(false)
      if (status === 'dihapus') navigate('/assets', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/assets" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
        <ArrowLeft size={18} /> Daftar Aset
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Kiri: foto + info + riwayat */}
        <div className="space-y-5 lg:col-span-2">
          <section className="card overflow-hidden">
            <AssetPhoto path={asset.photo_path} alt={asset.name} className="h-56 w-full !rounded-none sm:h-72" />
            <div className="space-y-3 p-4 sm:p-5">
              <div>
                <p className="font-mono text-xs text-slate-400">{asset.asset_code}</p>
                <h1 className="text-xl font-bold sm:text-2xl">{asset.name}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={asset.status} />
                <ConditionBadge value={asset.condition} />
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link to={`/assets/${asset.id}/edit`} className="btn-primary"><Pencil size={18} /> Ubah</Link>
                  {asset.status === 'aktif' && (
                    <Link to={`/loans?new=${asset.id}`} className="btn-secondary"><HandCoins size={18} /> Pinjamkan</Link>
                  )}
                  {!isDeleted && (
                    <Link to={`/maintenance?new=${asset.id}`} className="btn-secondary"><Wrench size={18} /> Jadwalkan Perawatan</Link>
                  )}
                  {isDeleted ? (
                    <button className="btn-secondary" onClick={() => changeStatus('aktif')} disabled={setStatus.isPending}>
                      <RotateCcw size={18} /> Pulihkan
                    </button>
                  ) : (
                    <button className="btn-secondary text-red-600 dark:text-red-400" onClick={() => setConfirmDelete(true)}>
                      <Trash2 size={18} /> Hapus
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <h2 className="mb-1 text-sm font-semibold">Informasi Aset</h2>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <Row label="Kategori">{asset.category?.name}</Row>
              <Row label="Merek">{asset.brand}</Row>
              <Row label="Model">{asset.model}</Row>
              <Row label="Nomor seri">{asset.serial_number}</Row>
              <Row label="Tanggal perolehan">{asset.acquisition_date ? formatDate(asset.acquisition_date) : ''}</Row>
              <Row label="Harga perolehan">{formatRupiah(asset.acquisition_price)}</Row>
              <Row label="Lokasi">{asset.location?.name}</Row>
              <Row label="Penanggung jawab">{asset.employee?.full_name}</Row>
              <Row label="Dibuat">{formatDateTime(asset.created_at)}</Row>
              <Row label="Terakhir diubah">{formatDateTime(asset.updated_at)}</Row>
            </dl>
            {asset.notes && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                <p className="mb-1 text-xs font-semibold text-slate-500">Catatan</p>
                <p className="whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}
          </section>

          <AssetLoanHistory assetId={asset.id} />
          <AssetMaintenanceHistory assetId={asset.id} />
        </div>

        {/* Kanan: QR + riwayat perubahan */}
        <div className="space-y-5">
          <section className="card flex flex-col items-center p-5 text-center">
            <h2 className="mb-3 text-sm font-semibold">Kode QR</h2>
            <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
              <QRCodeSVG value={assetQrValue(asset.id)} size={168} level="M" bgColor="#ffffff" fgColor="#000000" />
            </div>
            <p className="mt-3 font-mono text-sm font-bold">{asset.asset_code}</p>
            <p className="mt-1 text-xs text-slate-500">Scan dengan menu Scan QR untuk membuka halaman ini.</p>
            {canEdit && (
              <button className="btn-secondary mt-4 w-full" onClick={() => setPrintOpen(true)}>
                <Printer size={18} /> Cetak Label
              </button>
            )}
          </section>

          {canEdit && (
            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold">Riwayat Perubahan</h2>
              {audit.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : audit.isError ? (
                <p className="text-sm text-slate-400">Riwayat gagal dimuat.</p>
              ) : audit.data && audit.data.length > 0 ? (
                <AuditTimeline logs={audit.data} />
              ) : (
                <p className="text-sm text-slate-400">Belum ada riwayat.</p>
              )}
            </section>
          )}
        </div>
      </div>

      <PrintLabelsModal open={printOpen} onClose={() => setPrintOpen(false)} assetId={asset.id} code={asset.asset_code} name={asset.name} />
      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Hapus aset ini?"
        message="Aset akan dipindahkan ke status Dihapus dan hilang dari daftar. Riwayatnya tetap tersimpan dan Anda bisa memulihkannya kapan saja."
        confirmLabel="Ya, hapus"
        loading={setStatus.isPending}
        onConfirm={() => changeStatus('dihapus')}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
