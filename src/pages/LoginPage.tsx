import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import AuthShell from '@/components/ui/AuthShell'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  if (!loading && session) return <Navigate to={from} replace />

  const onSubmit = async (v: FormValues) => {
    setError(null)
    try {
      await signIn(v.email.trim(), v.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AuthShell title="Masuk ke LANILA ASET" subtitle="Gunakan akun yang diberikan oleh Admin.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" className="input" placeholder="nama@perusahaan.com" {...register('email')} />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="label">Kata sandi</label>
          <input id="password" type="password" autoComplete="current-password" className="input" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          Masuk
        </button>
        <div className="text-center">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
            Lupa kata sandi?
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
