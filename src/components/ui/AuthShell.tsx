import type { ReactNode } from 'react'
import Logo from './Logo'

/** Latar dekoratif: gradasi teal lembut + pola kotak kecil (unit inventaris) + garis geometris. Kontras sangat rendah. */
function AuthBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(20,184,166,0.12),transparent_70%)] dark:bg-[radial-gradient(70%_55%_at_50%_0%,rgba(20,184,166,0.16),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_100%_100%,rgba(14,116,144,0.08),transparent_70%)] dark:bg-[radial-gradient(45%_40%_at_100%_100%,rgba(14,116,144,0.18),transparent_70%)]" />

      {/* pola kotak kecil, memudar ke arah tengah supaya kartu login tetap fokus */}
      <svg className="absolute inset-0 h-full w-full text-brand-700/[0.09] dark:text-brand-300/[0.09]">
        <defs>
          <pattern id="auth-units" width="36" height="36" patternUnits="userSpaceOnUse">
            <rect x="14" y="14" width="8" height="8" rx="2" fill="currentColor" />
          </pattern>
          <radialGradient id="auth-fade" cx="50%" cy="50%" r="75%">
            <stop offset="30%" stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </radialGradient>
          <mask id="auth-mask">
            <rect width="100%" height="100%" fill="url(#auth-fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-units)" mask="url(#auth-mask)" />
      </svg>

      {/* garis geometris: kotak bertumpuk di dua sudut */}
      <svg viewBox="0 0 400 400" className="absolute -right-32 -top-32 hidden h-[420px] w-[420px] text-brand-700/[0.12] dark:text-brand-300/[0.12] sm:block" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="60" y="60" width="280" height="280" rx="48" transform="rotate(12 200 200)" />
        <rect x="100" y="100" width="200" height="200" rx="36" transform="rotate(12 200 200)" />
        <rect x="140" y="140" width="120" height="120" rx="26" transform="rotate(12 200 200)" />
      </svg>
      <svg viewBox="0 0 400 400" className="absolute -bottom-40 -left-32 hidden h-[460px] w-[460px] text-brand-700/[0.10] dark:text-brand-300/[0.10] sm:block" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="60" y="60" width="280" height="280" rx="48" transform="rotate(-10 200 200)" />
        <rect x="100" y="100" width="200" height="200" rx="36" transform="rotate(-10 200 200)" />
      </svg>
    </div>
  )
}

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden bg-white px-4 py-8 dark:bg-slate-950 sm:py-12">
      <AuthBackground />

      <div className="flex w-full max-w-[460px] flex-col items-center">
        <Logo variant="lockup" size={56} className="mb-7 sm:mb-8" />

        <div className="auth-enter card w-full !rounded-3xl border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_50px_-18px_rgba(14,116,144,0.25)] dark:border-slate-800 dark:shadow-[0_18px_50px_-18px_rgba(0,0,0,0.6)] sm:p-9">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>

        <p className="mt-8 text-center text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
          Bagian dari ekosistem Lanila · Satu Akun, Semua Aplikasi
        </p>
      </div>
    </main>
  )
}
