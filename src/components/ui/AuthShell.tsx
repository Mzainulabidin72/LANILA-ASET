import type { ReactNode } from 'react'
import Logo from './Logo'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-white p-4 dark:from-slate-950 dark:via-slate-950 dark:to-brand-900/30">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo size={44} /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Bagian dari ekosistem Lanila · Satu Akun, Semua Aplikasi</p>
      </div>
    </div>
  )
}
