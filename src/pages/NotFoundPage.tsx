import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
      <Link to="/dashboard" className="btn-primary mt-2">Ke Beranda</Link>
    </div>
  )
}
