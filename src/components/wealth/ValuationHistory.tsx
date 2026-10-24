import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import Money from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { useValuations } from '@/hooks/useWealth'
import { formatDate } from '@/lib/format'
import { formatMoney } from '@/lib/wealth/format'
import { SOURCE_LABEL } from '@/types/wealth'

/** Riwayat nilai. Grafik hanya tampil jika ada minimal 2 titik data (tidak ada grafik kosong/palsu). */
export default function ValuationHistory({ assetId, currency }: { assetId: string; currency: string }) {
  const { data, isLoading, isError } = useValuations(assetId)
  const { theme } = useTheme()
  const { hidden } = usePrivacy()
  const dark = theme === 'dark'
  const text = dark ? '#cbd5e1' : '#475569'

  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold">Riwayat Nilai</h2>
      {isLoading ? <Skeleton className="h-40 w-full" />
        : isError ? <p className="text-sm text-slate-600 dark:text-slate-400">Riwayat gagal dimuat.</p>
        : !data || data.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada riwayat. Riwayat tercatat setiap kali nilai atau harga diperbarui.</p>
        : (
          <>
            {data.length >= 2 && !hidden && (
              <div className="mb-4 h-48" role="img" aria-label="Grafik riwayat nilai">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.map((d) => ({ t: formatDate(d.valued_at), v: d.value }))} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="t" tick={{ fill: text, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: text, fontSize: 11 }} axisLine={false} tickLine={false} width={64}
                           tickFormatter={(v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: dark ? '#1e293b' : '#fff', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12, color: dark ? '#f1f5f9' : '#0f172a' }}
                      formatter={(v: number) => [formatMoney(v, currency), 'Nilai']}
                    />
                    <Line type="monotone" dataKey="v" stroke="#0e7490" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {data.length >= 2 && hidden && <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">Grafik disembunyikan karena nilai uang disembunyikan.</p>}
            {data.length < 2 && <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">Grafik tampil setelah ada minimal dua catatan nilai.</p>}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...data].reverse().slice(0, 10).map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{formatDate(d.valued_at)}</p>
                    <p className="truncate text-xs text-slate-600 dark:text-slate-400">{SOURCE_LABEL[d.source]}{d.note ? ` · ${d.note}` : ''}</p>
                  </div>
                  <Money value={d.value} currency={currency} className="font-semibold" />
                </li>
              ))}
            </ul>
          </>
        )}
    </section>
  )
}
