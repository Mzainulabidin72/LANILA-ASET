import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import type { ClassAllocation } from '@/lib/wealth/calc'
import { formatMoney } from '@/lib/wealth/format'
import { CLASS_SHORT, type AssetClass } from '@/types/wealth'
import { CLASS_COLOR } from './classMeta'
import Money from '@/components/ui/Money'

/** Donat alokasi aset per kategori + legenda berisi nilai dan persentase. */
export default function AllocationChart({ data }: { data: ClassAllocation[] }) {
  const { theme } = useTheme()
  const { hidden } = usePrivacy()
  const dark = theme === 'dark'
  const tip = {
    backgroundColor: dark ? '#1e293b' : '#ffffff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 12,
    color: dark ? '#f1f5f9' : '#0f172a',
    fontSize: 12,
  } as const

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="valueIdr" nameKey="cls" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none">
              {data.map((d) => <Cell key={d.cls} fill={CLASS_COLOR[d.cls as AssetClass] ?? '#94a3b8'} />)}
            </Pie>
            <Tooltip
              contentStyle={tip}
              formatter={(v: number, _n, item) => [hidden ? '•••••' : formatMoney(v), CLASS_SHORT[(item?.payload as ClassAllocation).cls as AssetClass]]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2" aria-label="Rincian alokasi">
        {data.map((d) => (
          <li key={d.cls} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: CLASS_COLOR[d.cls as AssetClass] ?? '#94a3b8' }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{CLASS_SHORT[d.cls as AssetClass] ?? d.cls}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400"><Money value={d.valueIdr} /></span>
            <span className="w-14 text-right font-semibold tabular-nums">{d.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
