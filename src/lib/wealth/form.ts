// Definisi form dinamis per jenis aset + validasi + konversi ke baris database.
// Fungsi murni (tanpa React/Supabase) supaya bisa diuji. Semua nilai form berupa string.
import type { AssetClass, Visibility } from '../../types/wealth.ts'
import { CURRENCIES, isPhysical } from '../../types/wealth.ts'
import { CONDITION_LABEL } from '../../types/database.ts'
import { averagePrice, round2 } from './calc.ts'

export type FieldKind = 'text' | 'textarea' | 'money' | 'decimal' | 'percent' | 'date' | 'select' | 'last4' | 'master'
export type MasterSource = 'categories' | 'locations' | 'employees'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  required?: boolean
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  master?: MasterSource
  /** tolak penulisan seperti "1.500" yang ambigu (titik ribuan atau desimal?) */
  guard?: boolean
  /** disimpan di kolom JSON `extra`, bukan kolom sendiri */
  extra?: boolean
  full?: boolean
}

const opt = (...labels: string[]) => labels.map((l) => ({ value: l, label: l }))
const f = (key: string, label: string, kind: FieldKind, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind, ...o })

const CONDITION_OPTIONS = Object.entries(CONDITION_LABEL).map(([value, label]) => ({ value, label }))
const MONEY_HELP = 'Tulis angka saja, desimal dengan koma atau titik. Jangan pakai titik pemisah ribuan.'

const unitPrice = (label: string) => f('unit_price', label, 'money', { guard: true, help: 'Opsional. Diisi manual oleh Anda.' })
const valuedAt = (label: string) => f('valued_at', label, 'date')
const fees = () => f('fees', 'Biaya transaksi (opsional)', 'money', { guard: true })
const acqDate = (label = 'Tanggal pembelian') => f('acquisition_date', label, 'date')
const notes = () => f('notes', 'Catatan', 'textarea', { full: true })

const PHYSICAL_COMMON = [f('condition', 'Kondisi', 'select', { options: CONDITION_OPTIONS })]

export const CLASS_FIELDS: Record<AssetClass, FieldDef[]> = {
  cash: [
    f('name', 'Nama rekening / dompet', 'text', { required: true, placeholder: 'mis. Tabungan Utama', full: true }),
    f('institution', 'Bank atau institusi', 'text', { required: true, placeholder: 'mis. BCA, GoPay' }),
    f('account_type', 'Jenis akun', 'select', { required: true, extra: true, options: opt('Tabungan', 'Giro', 'Dompet digital', 'Uang tunai') }),
    f('account_last4', '4 digit terakhir nomor rekening (opsional)', 'last4', { help: 'Hanya 4 karakter terakhir yang disimpan. Nomor lengkap tidak diminta.' }),
    f('current_value', 'Saldo saat ini', 'money', { required: true, guard: true, help: MONEY_HELP }),
    valuedAt('Saldo per tanggal'),
    notes(),
  ],
  stock: [
    f('name', 'Nama perusahaan', 'text', { required: true, placeholder: 'mis. Bank Central Asia Tbk', full: true }),
    f('symbol', 'Kode saham', 'text', { required: true, placeholder: 'mis. BBCA' }),
    f('exchange', 'Bursa', 'text', { extra: true, placeholder: 'mis. IDX' }),
    f('institution', 'Sekuritas / platform', 'text', { placeholder: 'mis. Ajaib, Stockbit' }),
    f('quantity', 'Jumlah saham', 'decimal', { required: true, guard: true, help: 'Jumlah lembar, bukan lot.' }),
    f('avg_price', 'Harga beli rata-rata per saham', 'money', { required: true, guard: true, help: MONEY_HELP }),
    fees(),
    acqDate(),
    unitPrice('Harga terkini per saham'),
    valuedAt('Harga per tanggal'),
    notes(),
  ],
  fund: [
    f('product_type', 'Jenis produk', 'select', { required: true, extra: true, options: opt('Reksa dana', 'Obligasi / SBN', 'Lainnya') }),
    f('name', 'Nama produk', 'text', { required: true, full: true }),
    f('symbol', 'Kode produk (opsional)', 'text'),
    f('institution', 'Manajer investasi / platform', 'text', { required: true }),
    f('quantity', 'Jumlah unit', 'decimal', { required: true, help: 'Untuk produk berbasis pokok, isi 1 dan harga beli = pokok.' }),
    f('avg_price', 'Harga beli per unit (NAB)', 'money', { required: true, guard: true, help: MONEY_HELP }),
    fees(),
    acqDate(),
    f('interest_rate', 'Kupon / imbal hasil (% per tahun)', 'percent'),
    f('maturity_date', 'Jatuh tempo (jika ada)', 'date'),
    unitPrice('NAB / harga terkini per unit'),
    f('current_value', 'Atau nilai terkini total', 'money', { guard: true, help: 'Opsional. Dipakai jika harga per unit tidak diisi.' }),
    valuedAt('Nilai per tanggal'),
    notes(),
  ],
  deposit: [
    f('name', 'Nama deposito', 'text', { required: true, full: true }),
    f('institution', 'Bank', 'text', { required: true }),
    f('total_cost', 'Pokok deposito', 'money', { required: true, guard: true, help: MONEY_HELP }),
    f('interest_rate', 'Suku bunga (% per tahun)', 'percent'),
    acqDate('Tanggal penempatan'),
    f('maturity_date', 'Jatuh tempo', 'date', { required: true }),
    f('current_value', 'Nilai terkini termasuk bunga', 'money', { guard: true, help: 'Opsional. Jika kosong, nilai = pokok.' }),
    valuedAt('Nilai per tanggal'),
    notes(),
  ],
  gold: [
    f('gold_form', 'Bentuk emas', 'select', { required: true, extra: true, options: opt('Emas fisik', 'Emas digital') }),
    f('name', 'Nama aset', 'text', { required: true, placeholder: 'mis. Antam 10 gram', full: true }),
    f('institution', 'Penyedia / toko', 'text', { placeholder: 'mis. Antam, Pegadaian' }),
    f('quantity', 'Berat (gram)', 'decimal', { required: true }),
    f('purity', 'Kadar', 'text', { extra: true, placeholder: 'mis. 24K / 999,9' }),
    f('avg_price', 'Harga beli per gram', 'money', { required: true, guard: true, help: MONEY_HELP }),
    fees(),
    acqDate(),
    f('storage', 'Tempat penyimpanan (emas fisik)', 'text', { extra: true, placeholder: 'mis. Safe deposit box' }),
    unitPrice('Harga terkini per gram'),
    valuedAt('Harga per tanggal'),
    notes(),
  ],
  crypto: [
    f('name', 'Nama aset', 'text', { required: true, placeholder: 'mis. Bitcoin', full: true }),
    f('symbol', 'Simbol token', 'text', { required: true, placeholder: 'mis. BTC' }),
    f('institution', 'Exchange / label wallet', 'text', { help: 'Jangan pernah memasukkan seed phrase, private key, atau kata sandi exchange.' }),
    f('quantity', 'Jumlah', 'decimal', { required: true }),
    f('avg_price', 'Harga beli rata-rata per koin', 'money', { required: true, guard: true, help: MONEY_HELP }),
    fees(),
    acqDate('Tanggal akuisisi'),
    unitPrice('Harga terkini per koin'),
    valuedAt('Harga per tanggal'),
    notes(),
  ],
  property: [
    f('name', 'Nama aset', 'text', { required: true, placeholder: 'mis. Rumah Bandung', full: true }),
    f('total_cost', 'Harga perolehan', 'money', { guard: true, help: MONEY_HELP }),
    acqDate('Tanggal perolehan'),
    f('current_value', 'Estimasi nilai saat ini', 'money', { guard: true, help: 'Diisi manual. Jika kosong, nilai sementara memakai harga perolehan.' }),
    valuedAt('Estimasi per tanggal'),
    f('location_text', 'Alamat / lokasi', 'text', { extra: true, full: true }),
    f('serial_number', 'Nomor sertifikat (opsional)', 'text'),
    ...PHYSICAL_COMMON,
    f('ownership', 'Atas nama / catatan kepemilikan', 'textarea', { extra: true, full: true }),
    notes(),
  ],
  vehicle: [
    f('name', 'Nama kendaraan', 'text', { required: true, placeholder: 'mis. Honda Brio 2021', full: true }),
    f('brand', 'Merek', 'text'),
    f('model', 'Model / tipe', 'text'),
    f('serial_number', 'Nomor polisi / rangka', 'text'),
    f('total_cost', 'Harga perolehan', 'money', { guard: true, help: MONEY_HELP }),
    acqDate('Tanggal perolehan'),
    f('current_value', 'Estimasi nilai saat ini', 'money', { guard: true, help: 'Diisi manual. Jika kosong, nilai sementara memakai harga perolehan.' }),
    valuedAt('Estimasi per tanggal'),
    f('location_text', 'Lokasi penyimpanan', 'text', { extra: true }),
    ...PHYSICAL_COMMON,
    f('ownership', 'Atas nama / catatan kepemilikan', 'textarea', { extra: true, full: true }),
    notes(),
  ],
  valuable: [
    f('name', 'Nama aset', 'text', { required: true, placeholder: 'mis. Laptop Dell Latitude 5440', full: true }),
    f('category_id', 'Kategori', 'master', { master: 'categories' }),
    f('brand', 'Merek', 'text'),
    f('model', 'Model', 'text'),
    f('serial_number', 'Nomor seri', 'text'),
    f('total_cost', 'Harga perolehan', 'money', { guard: true, help: MONEY_HELP }),
    acqDate('Tanggal perolehan'),
    f('current_value', 'Estimasi nilai saat ini', 'money', { guard: true, help: 'Opsional. Jika kosong, nilai sementara memakai harga perolehan.' }),
    valuedAt('Estimasi per tanggal'),
    f('location_id', 'Lokasi', 'master', { master: 'locations' }),
    f('responsible_employee_id', 'Penanggung jawab', 'master', { master: 'employees' }),
    ...PHYSICAL_COMMON,
    notes(),
  ],
  other: [
    f('name', 'Nama aset', 'text', { required: true, full: true }),
    f('category_id', 'Kategori', 'master', { master: 'categories' }),
    f('total_cost', 'Harga perolehan', 'money', { guard: true, help: MONEY_HELP }),
    acqDate('Tanggal perolehan'),
    f('current_value', 'Estimasi nilai saat ini', 'money', { guard: true, help: 'Diisi manual. Jika kosong, nilai sementara memakai harga perolehan.' }),
    valuedAt('Estimasi per tanggal'),
    ...PHYSICAL_COMMON,
    notes(),
  ],
}

/** Kunci yang menandakan pengguna mengisi nilai terkini (menentukan tanggal valuasi). */
const VALUE_KEYS = ['unit_price', 'current_value']

export function fieldsFor(cls: AssetClass, values?: Record<string, string>): FieldDef[] {
  const idr = (values?.currency || 'IDR') === 'IDR'
  const base = CLASS_FIELDS[cls]
  const hasValue = base.some((x) => VALUE_KEYS.includes(x.key))
  const list = [...base]
  if (!idr && hasValue) {
    list.push(f('fx_rate', 'Kurs ke IDR', 'money', { required: true, guard: false, help: 'Kurs yang Anda pakai (mis. 16000). Tanpa kurs, aset ini tidak masuk total IDR.', placeholder: 'mis. 16000' }))
  }
  return list
}

export function defaultVisibility(cls: AssetClass): Visibility {
  // Aset keuangan selalu pribadi. "Elektronik & barang berharga" mempertahankan perilaku inventaris lama (bersama).
  return cls === 'valuable' ? 'shared' : 'private'
}

export function todayLocal(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export function defaultValues(cls: AssetClass, now: Date = new Date()): Record<string, string> {
  const v: Record<string, string> = { currency: 'IDR', visibility: defaultVisibility(cls) }
  for (const fd of CLASS_FIELDS[cls]) {
    v[fd.key] = fd.kind === 'select' ? (fd.options?.[0]?.value ?? '') : ''
  }
  if (CLASS_FIELDS[cls].some((x) => x.key === 'valued_at')) v.valued_at = todayLocal(now)
  v.fx_rate = ''
  return v
}

// ------------------------------------------------------------------ parsing & validasi

/** Angka positif dengan desimal koma/titik. Mengembalikan null jika tidak valid. */
export function parseDecimal(raw: string | undefined | null): number | null {
  const s = (raw ?? '').trim().replace(/\s/g, '')
  if (!/^\d+([.,]\d+)?$/.test(s)) return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const THOUSANDS_LOOK = /^[1-9]\d{0,2}(\.\d{3})+$/
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
const decimalsOf = (s: string) => (s.split(/[.,]/)[1] ?? '').length

const LIMITS: Record<string, number> = { name: 150, notes: 1000, ownership: 500 }

export function validate(cls: AssetClass, values: Record<string, string>, now: Date = new Date()): Record<string, string> {
  const errors: Record<string, string> = {}
  const today = todayLocal(now)
  const cur = values.currency || 'IDR'
  if (!(CURRENCIES as readonly string[]).includes(cur)) errors.currency = 'Mata uang tidak didukung.'

  for (const fd of fieldsFor(cls, values)) {
    const raw = (values[fd.key] ?? '').trim()
    if (!raw) {
      if (fd.required) errors[fd.key] = `${fd.label} wajib diisi.`
      continue
    }
    switch (fd.kind) {
      case 'text':
      case 'textarea': {
        const max = LIMITS[fd.key] ?? (fd.kind === 'textarea' ? 1000 : 100)
        if (raw.length > max) errors[fd.key] = `Maksimal ${max} karakter.`
        break
      }
      case 'money':
      case 'decimal': {
        if (fd.guard && THOUSANDS_LOOK.test(raw)) {
          errors[fd.key] = 'Tulis angka tanpa titik pemisah ribuan (mis. 1500000).'
          break
        }
        const n = parseDecimal(raw)
        if (n === null) errors[fd.key] = 'Isi dengan angka (mis. 1500000 atau 1500,50).'
        else if (decimalsOf(raw) > 8) errors[fd.key] = 'Maksimal 8 angka di belakang koma.'
        else if (n > 9_999_999_999_999) errors[fd.key] = 'Angka terlalu besar.'
        else if ((fd.key === 'quantity' || fd.key === 'avg_price' || fd.key === 'fx_rate') && n <= 0) errors[fd.key] = `${fd.label} harus lebih dari 0.`
        break
      }
      case 'percent': {
        const n = parseDecimal(raw)
        if (n === null || n > 100) errors[fd.key] = 'Isi persentase antara 0 dan 100.'
        break
      }
      case 'date':
        if (!isDate(raw)) errors[fd.key] = 'Tanggal tidak valid.'
        else if (['acquisition_date', 'valued_at'].includes(fd.key) && raw > today) errors[fd.key] = 'Tanggal tidak boleh di masa depan.'
        break
      case 'select':
        if (fd.options && !fd.options.some((o) => o.value === raw)) errors[fd.key] = 'Pilihan tidak valid.'
        break
      case 'last4':
        if (!/^[0-9A-Za-z]{1,4}$/.test(raw)) errors[fd.key] = 'Maksimal 4 karakter (4 digit terakhir saja).'
        break
      case 'master':
        break
    }
  }

  const acq = (values.acquisition_date ?? '').trim()
  const mat = (values.maturity_date ?? '').trim()
  if (acq && mat && isDate(acq) && isDate(mat) && mat < acq && !errors.maturity_date) {
    errors.maturity_date = 'Jatuh tempo tidak boleh sebelum tanggal pembelian.'
  }
  return errors
}

// ------------------------------------------------------------------ form <-> database

const nn = (s: string | undefined) => {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}
const dec = (s: string | undefined) => parseDecimal(s)
const asStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

function dateToIso(date: string, existing?: string | null): string {
  if (existing) {
    const e = new Date(existing)
    if (!Number.isNaN(e.getTime()) && todayLocal(e) === date) return existing // tanggal tidak berubah: pertahankan jam asli
  }
  return new Date(`${date}T12:00:00`).toISOString()
}

export interface RowContext {
  userId: string
  now?: Date
  existingValuedAt?: string | null
}

const QTY_CLASSES: AssetClass[] = ['stock', 'fund', 'crypto', 'gold']

/** Nilai form -> kolom aset_assets. Tidak menyentuh valuation_source/valuation_note (diatur di dialog "Perbarui nilai"). */
export function toRow(cls: AssetClass, v: Record<string, string>, ctx: RowContext): Record<string, unknown> {
  const now = ctx.now ?? new Date()
  const currency = v.currency || 'IDR'
  const quantity = QTY_CLASSES.includes(cls) ? dec(v.quantity) : null
  const feeVal = QTY_CLASSES.includes(cls) ? (dec(v.fees) ?? 0) : 0
  const avg = dec(v.avg_price)

  let acquisitionPrice = 0
  if (QTY_CLASSES.includes(cls)) acquisitionPrice = quantity && avg ? round2(quantity * avg + feeVal) : 0
  else if (cls !== 'cash') acquisitionPrice = dec(v.total_cost) ?? 0

  const unit = dec(v.unit_price)
  const current = dec(v.current_value)
  const hasValue = unit !== null || current !== null
  const valuedDate = nn(v.valued_at)

  const extra: Record<string, string> = {}
  for (const fd of CLASS_FIELDS[cls]) {
    if (fd.extra) {
      const t = nn(v[fd.key])
      if (t) extra[fd.key] = t
    }
  }

  const physical = isPhysical(cls)
  const visibility: Visibility = physical ? ((v.visibility as Visibility) === 'shared' ? 'shared' : 'private') : 'private'

  return {
    asset_class: cls,
    name: (v.name ?? '').trim(),
    currency,
    institution: nn(v.institution),
    symbol: nn(v.symbol)?.toUpperCase() ?? null,
    account_last4: nn(v.account_last4),
    quantity,
    fees: QTY_CLASSES.includes(cls) && feeVal > 0 ? feeVal : null,
    acquisition_price: acquisitionPrice,
    acquisition_date: nn(v.acquisition_date),
    current_unit_price: unit,
    current_value: current,
    valued_at: hasValue ? dateToIso(valuedDate ?? todayLocal(now), ctx.existingValuedAt) : null,
    fx_rate: currency === 'IDR' ? null : dec(v.fx_rate),
    interest_rate: dec(v.interest_rate),
    maturity_date: nn(v.maturity_date),
    category_id: nn(v.category_id),
    brand: nn(v.brand),
    model: nn(v.model),
    serial_number: nn(v.serial_number),
    location_id: nn(v.location_id),
    responsible_employee_id: nn(v.responsible_employee_id),
    condition: physical ? (v.condition || 'baik') : 'baik',
    notes: nn(v.notes),
    extra,
    visibility,
    owner_id: visibility === 'private' ? ctx.userId : null,
  }
}

export interface AssetLike {
  asset_class: string
  name: string
  currency: string
  institution: string | null
  symbol: string | null
  account_last4: string | null
  quantity: number | string | null
  fees: number | string | null
  acquisition_price: number | string | null
  acquisition_date: string | null
  current_unit_price: number | string | null
  current_value: number | string | null
  valued_at: string | null
  fx_rate: number | string | null
  interest_rate: number | string | null
  maturity_date: string | null
  category_id: string | null
  brand: string | null
  model: string | null
  serial_number: string | null
  location_id: string | null
  responsible_employee_id: string | null
  condition: string
  notes: string | null
  visibility: string
  extra: Record<string, unknown> | null
}

/** Aset dari database -> nilai form (untuk mode ubah). */
export function fromAsset(a: AssetLike, now: Date = new Date()): Record<string, string> {
  const cls = a.asset_class as AssetClass
  const v = defaultValues(cls, now)
  const extra = a.extra ?? {}
  v.currency = a.currency || 'IDR'
  v.visibility = a.visibility
  v.name = a.name
  v.institution = asStr(a.institution)
  v.symbol = asStr(a.symbol)
  v.account_last4 = asStr(a.account_last4)
  v.quantity = asStr(a.quantity)
  v.fees = asStr(a.fees)
  v.acquisition_date = asStr(a.acquisition_date)
  v.unit_price = asStr(a.current_unit_price)
  v.current_value = asStr(a.current_value)
  v.fx_rate = asStr(a.fx_rate)
  v.interest_rate = asStr(a.interest_rate)
  v.maturity_date = asStr(a.maturity_date)
  v.category_id = asStr(a.category_id)
  v.brand = asStr(a.brand)
  v.model = asStr(a.model)
  v.serial_number = asStr(a.serial_number)
  v.location_id = asStr(a.location_id)
  v.responsible_employee_id = asStr(a.responsible_employee_id)
  v.condition = a.condition || 'baik'
  v.notes = asStr(a.notes)
  v.valued_at = a.valued_at ? todayLocal(new Date(a.valued_at)) : CLASS_FIELDS[cls].some((x) => x.key === 'valued_at') ? todayLocal(now) : ''

  const acq = a.acquisition_price === null ? null : Number(a.acquisition_price)
  if (QTY_CLASSES.includes(cls)) {
    const avg = averagePrice(acq, a.fees === null ? null : Number(a.fees), a.quantity === null ? null : Number(a.quantity))
    v.avg_price = avg === null ? '' : String(round2(avg * 1e6) / 1e6)
  } else {
    v.total_cost = acq && acq > 0 ? String(acq) : ''
  }
  for (const fd of CLASS_FIELDS[cls]) {
    if (fd.extra) v[fd.key] = asStr(extra[fd.key]) || (fd.kind === 'select' ? (fd.options?.[0]?.value ?? '') : '')
  }
  return v
}
