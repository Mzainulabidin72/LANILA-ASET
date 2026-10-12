import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import type { ChartDatum } from '@/hooks/useDashboard'

const PALETTE = ['#0e7490', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#22c55e', '#8b5cf6', '#64748b']
const CONDITION_COLORS: Record<string, string> = {
  baik: '#22c55e',
  rusak_ringan: '#f59e0b',
  rusak_berat: '#ef4444',
  hilang: '#64748b',
}

function useChartTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    text: dark ? '#cbd5e1' : '#475569',
    tooltip: {
      backgroundColor: dark ? '#1e293b' : '#ffffff',
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 12,
      color: dark ? '#f1f5f9' : '#0f172a',
      fontSize: 12,
    } as const,
  }
}

/** Grafik batang horizontal (kategori, lokasi). */
export function HorizontalBars({ data }: { data: ChartDatum[] }) {
  const t = useChartTheme()
  const top = data.slice(0, 6) // 6 terbesar supaya tetap terbaca di HP
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={top} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fill: t.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={96} tick={{ fill: t.text, fontSize: 11 }} axisLine={false} tickLine={false}
               tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + '…' : v)} />
        <Tooltip cursor={{ fill: 'rgba(100,116,139,0.1)' }} contentStyle={t.tooltip} formatter={(v: number) => [`${v} aset`, 'Jumlah']} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {top.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Grafik donat (kondisi aset). */
export function ConditionDonut({ data }: { data: ChartDatum[] }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((d) => <Cell key={d.key} fill={CONDITION_COLORS[d.key ?? ''] ?? '#94a3b8'} />)}
        </Pie>
        <Tooltip contentStyle={t.tooltip} formatter={(v: number, n: string) => [`${v} aset`, n]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: t.text }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
