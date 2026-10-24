export const ASSET_CLASSES = ['cash', 'stock', 'fund', 'deposit', 'gold', 'crypto', 'property', 'vehicle', 'valuable', 'other'] as const
export type AssetClass = (typeof ASSET_CLASSES)[number]

export const CLASS_LABEL: Record<AssetClass, string> = {
  cash: 'Kas & Rekening Bank',
  stock: 'Saham',
  fund: 'Reksa Dana & Obligasi',
  deposit: 'Deposito',
  gold: 'Emas & Logam Mulia',
  crypto: 'Kripto',
  property: 'Properti & Tanah',
  vehicle: 'Kendaraan',
  valuable: 'Elektronik & Barang Berharga',
  other: 'Aset Lainnya',
}

/** Label pendek untuk chip kategori */
export const CLASS_SHORT: Record<AssetClass, string> = {
  cash: 'Kas & Bank',
  stock: 'Saham',
  fund: 'Reksa Dana & Obligasi',
  deposit: 'Deposito',
  gold: 'Emas',
  crypto: 'Kripto',
  property: 'Properti',
  vehicle: 'Kendaraan',
  valuable: 'Elektronik & Barang Berharga',
  other: 'Lainnya',
}

export const CLASS_HINT: Record<AssetClass, string> = {
  cash: 'Rekening bank, dompet digital, uang tunai',
  stock: 'Saham di bursa efek',
  fund: 'Reksa dana, obligasi, SBN',
  deposit: 'Deposito berjangka',
  gold: 'Emas fisik atau emas digital',
  crypto: 'Aset kripto di exchange atau wallet',
  property: 'Rumah, tanah, apartemen',
  vehicle: 'Mobil, motor, dan kendaraan lain',
  valuable: 'Laptop, perangkat, dan barang berharga',
  other: 'Aset lain yang dinilai manual',
}

/** Aset keuangan: selalu pribadi. */
export const FINANCIAL_CLASSES: readonly AssetClass[] = ['cash', 'stock', 'fund', 'deposit', 'gold', 'crypto']
/** Aset fisik: bisa pribadi atau inventaris bersama; punya kondisi/lokasi, peminjaman, perawatan, QR. */
export const PHYSICAL_CLASSES: readonly AssetClass[] = ['property', 'vehicle', 'valuable', 'other']
/** Aset yang untung/ruginya (belum direalisasi) dihitung di tingkat portofolio. */
export const GAIN_CLASSES: readonly AssetClass[] = ['stock', 'fund', 'crypto', 'gold']

export type Visibility = 'private' | 'shared'
export type ValuationSource = 'manual' | 'live' | 'delayed'

export const SOURCE_LABEL: Record<ValuationSource, string> = {
  manual: 'Diisi manual',
  live: 'Data pasar langsung',
  delayed: 'Data pasar tertunda',
}

export const CURRENCIES = ['IDR', 'USD', 'SGD', 'EUR', 'JPY', 'AUD', 'MYR'] as const

export const isPhysical = (c: AssetClass | string | null | undefined): boolean => PHYSICAL_CLASSES.includes(c as AssetClass)
