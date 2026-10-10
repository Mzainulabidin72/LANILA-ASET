import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MailCheck } from 'lucide-react'
import AuthShell from '@/components/ui/AuthShell'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({ email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid') })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { sendResetEmail } = useAuth()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (v: FormValues) => {
    setError(null)
    try {
      await sendResetEmail(v.email.trim())
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AuthShell title="Lupa kata sandi" subtitle="Kami akan mengirim tautan untuk mengatur ulang kata sandi.">
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto mb-3 text-brand-600" size={40} />
          <p className="text-sm">Jika email terdaftar, tautan reset sudah dikirim. Cek kotak masuk (dan folder spam).</p>
          <Link to="/login" className="btn-secondary mt-5 w-full">Kembali ke halaman masuk</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <ErrorMessage message={error} />}
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" inputMode="email" className="input" {...register('email')} />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            Kirim tautan reset
          </button>
          <Link to="/login" className="btn-ghost w-full">Batal</Link>
        </form>
      )}
    </AuthShell>
  )
}
