import { formatDate, formatRupiah } from '@/lib/format'
import { CONDITION_LABEL, STATUS_LABEL } from '@/types/database'
import { type AssetGroup, type ReportAsset, type ReportLoan } from '@/lib/reportData'

const th = 'p-3 font-semibold'
const head = 'border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'

/** Tabel pratinjau daftar aset (satu halaman). */
export function AssetPreview({ rows }: { rows: ReportAsset[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className={head}>
          <tr>
            <th scope="col" className={th}>Kode Aset</th>
            <th scope="col" className={th}>Nama Aset</th>
            <th scope="col" className={th}>Kategori</th>
            <th scope="col" className={th}>Lokasi</th>
            <th scope="col" className={th}>Kondisi</th>
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r.asset_code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="p-3 font-mono text-xs">{r.asset_code}</td>
              <td className="p-3 font-medium">{r.name}</td>
              <td className="p-3">{r.category || '-'}</td>
              <td className="p-3">{r.location || '-'}</td>
              <td className="p-3">{CONDITION_LABEL[r.condition]}</td>
              <td className="p-3">{STATUS_LABEL[r.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PER_GROUP = 25

/** Pratinjau per kelompok: ringkasan (jumlah, subtotal, persentase) + rincian yang bisa dibuka. */
export function GroupedPreview({ groups, kind }: { groups: AssetGroup[]; kind: 'by_location' | 'by_condition' }) {
  return (
    <div className="space-y-2">
      {groups.map((g, i) => (
        <details key={g.key} className="card group" open={i === 0}>
          <summary className="flex min-h-[48px] cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3.5 [&::-webkit-details-marker]:hidden">
            <span className="font-semibold">{g.label}</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-slate-700 dark:text-slate-300">
              <span><b className="tabular-nums">{g.count}</b> aset</span>
              {kind === 'by_condition' && <span className="tabular-nums">{g.pct.toFixed(1)}%</span>}
              <span className="tabular-nums">Subtotal {formatRupiah(g.total)}</span>
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className={head}>
                <tr>
                  <th scope="col" className={th}>Kode Aset</th>
                  <th scope="col" className={th}>Nama Aset</th>
                  <th scope="col" className={th}>Kategori</th>
                  <th scope="col" className={th}>{kind === 'by_location' ? 'Kondisi' : 'Lokasi'}</th>
                  <th scope="col" className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {g.rows.slice(0, PER_GROUP).map((r) => (
                  <tr key={r.asset_code}>
                    <td className="p-3 font-mono text-xs">{r.asset_code}</td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.category || '-'}</td>
                    <td className="p-3">{kind === 'by_location' ? CONDITION_LABEL[r.condition] : r.location || '-'}</td>
                    <td className="p-3">{STATUS_LABEL[r.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {g.count > PER_GROUP && <p className="p-3 text-xs text-slate-600 dark:text-slate-400">Menampilkan {PER_GROUP} dari {g.count} aset. Seluruhnya ada di berkas unduhan.</p>}
          </div>
        </details>
      ))}
    </div>
  )
}

const STATE_CLS: Record<string, string> = {
  Dipinjam: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  Terlambat: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Dikembalikan: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
}

/** Tabel pratinjau riwayat peminjaman (satu halaman). Tidak ada ID transaksi di data, jadi memakai nomor urut. */
export function LoanPreview({ rows, startIndex }: { rows: ReportLoan[]; startIndex: number }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className={head}>
          <tr>
            <th scope="col" className={`${th} w-12`}>No.</th>
            <th scope="col" className={th}>Aset</th>
            <th scope="col" className={th}>Peminjam</th>
            <th scope="col" className={th}>Tgl Pinjam</th>
            <th scope="col" className={th}>Jatuh Tempo</th>
            <th scope="col" className={th}>Tgl Kembali</th>
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={`${r.asset_code}-${r.loan_date}-${startIndex + i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="p-3 tabular-nums text-slate-600 dark:text-slate-400">{startIndex + i + 1}</td>
              <td className="p-3"><span className="block font-medium">{r.asset_name}</span><span className="font-mono text-xs text-slate-600 dark:text-slate-400">{r.asset_code}</span></td>
              <td className="p-3">{r.employee || '-'}</td>
              <td className="whitespace-nowrap p-3 tabular-nums">{formatDate(r.loan_date)}</td>
              <td className="whitespace-nowrap p-3 tabular-nums">{formatDate(r.due_date)}</td>
              <td className="whitespace-nowrap p-3 tabular-nums">{formatDate(r.return_date)}</td>
              <td className="p-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_CLS[r.state] ?? ''}`}>{r.state}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

