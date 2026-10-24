import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Money from '@/components/ui/Money'
import AssetPhoto from '@/components/assets/AssetPhoto'
import { ConditionBadge } from '@/components/ui/Badges'
import type { AssetWithRefs } from '@/hooks/useAssets'
import { averagePrice, maskLast4, type AssetValuation } from '@/lib/wealth/calc'
import { formatDate } from '@/lib/format'
import { formatQuantity } from '@/lib/wealth/format'
import { CLASS_SHORT, isPhysical, type AssetClass } from '@/types/wealth'
import { CLASS_ICON } from './classMeta'
import { GainCell, UpdatedCell, ValueCell } from './ValueParts'

export interface PortfolioRow { a: AssetWithRefs; v: AssetValuation }

interface Col { key: string; header: string; right?: boolean; cell: (r: PortfolioRow) => ReactNode }

const muted = 'text-xs text-slate-600 dark:text-slate-400'
const dash = <span className="text-slate-600 dark:text-slate-400">-</span>

const unitLabel = (a: AssetWithRefs): string =>
  a.asset_class === 'stock' ? 'lbr' : a.asset_class === 'gold' ? 'gr' : a.asset_class === 'crypto' ? (a.symbol ?? '') : 'unit'

const avgOf = (a: AssetWithRefs) => averagePrice(Number(a.acquisition_price), a.fees === null ? null : Number(a.fees), a.quantity === null ? null : Number(a.quantity))

const assetCell = (r: PortfolioRow): ReactNode => {
  const a = r.a
  const Icon = CLASS_ICON[a.asset_class]
  const sub = a.symbol || (a.asset_class === 'cash' && a.account_last4 ? maskLast4(a.account_last4) : '') || a.asset_code
  return (
    <div className="flex items-center gap-3">
      {isPhysical(a.asset_class) && a.photo_path
        ? <AssetPhoto path={a.photo_path} alt={a.name} className="h-10 w-10 shrink-0" />
        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon size={18} aria-hidden="true" /></span>}
      <div className="min-w-0">
        <Link to={`/assets/${a.id}`} className="block truncate font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{a.name}</Link>
        <p className={`truncate ${muted}`}>{sub}</p>
      </div>
    </div>
  )
}

const cols = {
  asset: { key: 'asset', header: 'Aset / Akun', cell: assetCell } as Col,
  category: { key: 'cat', header: 'Kategori', cell: (r) => <span>{CLASS_SHORT[r.a.asset_class]}{r.a.category?.name ? <span className={`block ${muted}`}>{r.a.category.name}</span> : null}</span> } as Col,
  institution: { key: 'inst', header: 'Institusi / Platform', cell: (r) => r.a.institution ?? dash } as Col,
  accountType: { key: 'acctype', header: 'Jenis', cell: (r) => (r.a.extra?.account_type as string) ?? dash } as Col,
  currency: { key: 'cur', header: 'Mata Uang', cell: (r) => r.a.currency } as Col,
  qty: { key: 'qty', header: 'Jumlah', right: true, cell: (r) => (r.a.quantity === null ? dash : <span className="tabular-nums">{formatQuantity(Number(r.a.quantity))} <span className={muted}>{unitLabel(r.a)}</span></span>) } as Col,
  avg: { key: 'avg', header: 'Harga Rata-rata', right: true, cell: (r) => { const x = avgOf(r.a); return x === null ? dash : <Money value={x} currency={r.a.currency} /> } } as Col,
  latest: { key: 'latest', header: 'Harga Terkini', right: true, cell: (r) => (r.a.current_unit_price === null ? dash : <Money value={Number(r.a.current_unit_price)} currency={r.a.currency} />) } as Col,
  value: { key: 'value', header: 'Nilai Saat Ini', right: true, cell: (r) => <ValueCell v={r.v} /> } as Col,
  balance: { key: 'bal', header: 'Saldo', right: true, cell: (r) => <ValueCell v={r.v} /> } as Col,
  cost: { key: 'cost', header: 'Harga Perolehan', right: true, cell: (r) => (r.v.cost === null ? dash : <Money value={r.v.cost} currency={r.a.currency} />) } as Col,
  principal: { key: 'prin', header: 'Pokok', right: true, cell: (r) => (r.v.cost === null ? dash : <Money value={r.v.cost} currency={r.a.currency} />) } as Col,
  gain: { key: 'gain', header: 'Untung / Rugi', right: true, cell: (r) => <GainCell v={r.v} /> } as Col,
  interest: { key: 'int', header: 'Bunga', right: true, cell: (r) => (r.a.interest_rate === null ? dash : `${Number(r.a.interest_rate)}%`) } as Col,
  maturity: { key: 'mat', header: 'Jatuh Tempo', cell: (r) => (r.a.maturity_date ? formatDate(r.a.maturity_date) : dash) } as Col,
  acqDate: { key: 'acq', header: 'Tgl Perolehan', cell: (r) => (r.a.acquisition_date ? formatDate(r.a.acquisition_date) : dash) } as Col,
  condition: { key: 'cond', header: 'Kondisi', cell: (r) => <ConditionBadge value={r.a.condition} /> } as Col,
  location: { key: 'loc', header: 'Lokasi', cell: (r) => r.a.location?.name ?? (r.a.extra?.location_text as string) ?? dash } as Col,
  updated: { key: 'upd', header: 'Diperbarui', cell: (r) => <UpdatedCell cls={r.a.asset_class} valuedAt={r.a.valued_at} updatedAt={r.a.updated_at} /> } as Col,
}

/** Kolom menyesuaikan kategori yang dipilih. */
export function columnsFor(cls: '' | AssetClass): Col[] {
  switch (cls) {
    case 'cash': return [cols.asset, cols.institution, cols.accountType, cols.currency, cols.balance, cols.updated]
    case 'stock':
    case 'crypto':
    case 'gold':
    case 'fund': return [cols.asset, cols.institution, cols.qty, cols.avg, cols.latest, cols.value, cols.gain, cols.updated]
    case 'deposit': return [cols.asset, cols.institution, cols.principal, cols.interest, cols.maturity, cols.value, cols.updated]
    case 'property':
    case 'vehicle':
    case 'valuable':
    case 'other': return [cols.asset, cols.category, cols.acqDate, cols.cost, cols.value, cols.condition, cols.location]
    default: return [cols.asset, cols.category, cols.institution, cols.qty, cols.value, cols.cost, cols.gain, cols.updated]
  }
}

export function PortfolioTable({ rows, cls }: { rows: PortfolioRow[]; cls: '' | AssetClass }) {
  const navigate = useNavigate()
  const columns = columnsFor(cls)
  return (
    <div className="card hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={`p-3 font-semibold ${c.right ? 'text-right' : ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r.a.id} onClick={() => navigate(`/assets/${r.a.id}`)} className="cursor-pointer align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {columns.map((c) => <td key={c.key} className={`p-3 ${c.right ? 'text-right' : ''}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Kartu untuk layar kecil. */
export function PortfolioCards({ rows }: { rows: PortfolioRow[] }) {
  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((r) => (
        <li key={r.a.id}>
          <Link to={`/assets/${r.a.id}`} className="card block space-y-2.5 p-3.5 active:bg-slate-50 dark:active:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{assetCell(r)}</div>
              <div className="shrink-0 text-right"><ValueCell v={r.v} /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>{CLASS_SHORT[r.a.asset_class]}{r.a.institution ? ` · ${r.a.institution}` : ''}</span>
              {r.v.gain !== null && <GainCell v={r.v} />}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
