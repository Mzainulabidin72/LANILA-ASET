import { useSearchParams } from 'react-router-dom'
import { useMasterTotals } from '@/hooks/useMaster'
import { TABS } from '@/components/master/masterConfig'
import MasterTab from '@/components/master/MasterTab'
import CountTabs from '@/components/ui/CountTabs'

const PANEL_ID = 'master-panel'

export default function MasterDataPage() {
  const [params, setParams] = useSearchParams()
  const totals = useMasterTotals()
  const current = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0]

  const options = TABS.map((t) => ({ value: t.key, label: t.label, count: totals.data?.[t.key] }))
  const setTab = (key: (typeof TABS)[number]['key']) => {
    const next = new URLSearchParams(params)
    if (key === TABS[0].key) next.delete('tab'); else next.set('tab', key)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Master Data</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Kelola kategori, lokasi, dan data pegawai yang digunakan dalam pengelolaan aset.</p>
      </div>

      <CountTabs value={current.key} options={options} onChange={setTab} panelId={PANEL_ID} idPrefix="master" label="Jenis master data" />

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`master-tab-${current.key}`} tabIndex={0} className="outline-none">
        {/* key = tab: pencarian, halaman, dan formulir tidak terbawa ke tab lain */}
        <MasterTab key={current.key} tab={current} />
      </div>
    </div>
  )
}
