import { useEffect, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthShell from '@/components/ui/AuthShell'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useAuth } from '@/contexts/AuthContext'

// Kata sandi tidak dibatasi panjang minimal di sisi klien: aturan panjang milik server (Supabase),
// dan akun lama (akun bersama ekosistem Lanila) mungkin punya sandi yang lebih pendek.
const schema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})
type FormValues = z.infer<typeof schema>

const fieldClass =
  'input !min-h-[48px] transition-colors hover:border-slate-300 placeholder:text-slate-500 aria-[invalid=true]:border-red-500 dark:hover:border-slate-600 dark:placeholder:text-slate-400 motion-reduce:transition-none'

/** Di HP, geser kolom yang sedang diisi ke tengah layar supaya tidak tertutup keyboard virtual. */
function bringIntoView(e: FocusEvent<HTMLInputElement>) {
  if (!window.matchMedia('(max-width: 639px)').matches) return
  const el = e.currentTarget
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }), 300)
}

export default function LoginPage() {
  const { signIn, session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const { register, handleSubmit, watch, setFocus, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  const passwordField = register('password')

  // Pesan error hilang saat pengguna mulai mengetik lagi
  useEffect(() => {
    const sub = watch(() => setError(null))
    return () => sub.unsubscribe()
  }, [watch])

  if (!loading && session) return <Navigate to={from} replace />

  const onSubmit = async (v: FormValues) => {
    if (isSubmitting) return
    setError(null)
    if (!navigator.onLine) {
      setError('Anda sedang offline. Masuk membutuhkan koneksi internet.')
      return
    }
    try {
      await signIn(v.email.trim(), v.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setFocus('password')
    }
  }

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)

  return (
    <AuthShell title="Masuk ke LANILA ASET" subtitle="Gunakan akun yang diberikan oleh Admin.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-busy={isSubmitting}>
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nama@perusahaan.com"
            className={fieldClass}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            onFocus={bringIntoView}
            {...register('email')}
          />
          {errors.email && <p id="email-error" className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">Kata sandi</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Masukkan kata sandi"
              className={`${fieldClass} !pr-12`}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : capsOn ? 'caps-hint' : undefined}
              onFocus={bringIntoView}
              onKeyDown={trackCaps}
              onKeyUp={trackCaps}
              {...passwordField}
              onBlur={(e) => { passwordField.onBlur(e); setCapsOn(false) }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 motion-reduce:transition-none"
            >
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="field-error">{errors.password.message}</p>}
          {!errors.password && capsOn && (
            <p id="caps-hint" className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Caps Lock sedang aktif.</p>
          )}
        </div>

        <div className="-mt-2 flex justify-end">
          <Link
            to="/forgot-password"
            className="inline-flex min-h-[44px] items-center rounded-lg px-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Lupa kata sandi?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary h-12 w-full text-base shadow-sm shadow-brand-900/10 transition active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Memproses…
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
