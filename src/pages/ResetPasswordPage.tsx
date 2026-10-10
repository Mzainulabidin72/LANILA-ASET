import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import AuthShell from '@/components/ui/AuthShell'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useAuth } from '@/contexts/AuthContext'

const schema = z
  .object({
    password: z.string().min(8, 'Minimal 8 karakter'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Konfirmasi kata sandi tidak sama' })
type FormValues = z.infer<typeof schema>

/** Halaman tujuan dari tautan email "reset password" (Supabase otomatis membuat sesi sementara). */
export default function ResetPasswordPage() {
  const { updatePassword, session, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (v: FormValues) => {
    setError(null)
    try {
      await updatePassword(v.password)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AuthShell title="Atur kata sandi baru">
      {!loading && !session ? (
        <ErrorMessage message="Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <ErrorMessage message={error} />}
          <div>
            <label htmlFor="password" className="label">Kata sandi baru</label>
            <input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirm" className="label">Ulangi kata sandi</label>
            <input id="confirm" type="password" autoComplete="new-password" className="input" {...register('confirm')} />
            {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            Simpan kata sandi
          </button>
        </form>
      )}
    </AuthShell>
  )
}
