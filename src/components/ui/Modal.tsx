import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Dialog: tampil sebagai "bottom sheet" di HP dan kotak di tengah di laptop. Fokus dikelola untuk pengguna keyboard. */
export default function Modal({ open, onClose, title, children, footer }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // onClose biasanya fungsi baru di setiap render parent; simpan di ref supaya efek fokus hanya berjalan saat dialog dibuka/ditutup
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Pindahkan fokus ke dalam dialog bila belum ada elemen di dalamnya yang autoFocus
    const t = setTimeout(() => {
      const el = dialogRef.current
      if (el && !el.contains(document.activeElement)) (el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus()
    }, 0)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.() // kembalikan fokus ke tombol yang membuka dialog
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl outline-none dark:bg-slate-900 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="btn-ghost -mr-2 min-w-[44px] !px-0"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-slate-100 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}
