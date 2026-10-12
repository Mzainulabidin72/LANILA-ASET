import { ImageOff } from 'lucide-react'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { Skeleton } from '@/components/ui/Skeleton'

interface Props { path: string | null; alt: string; className?: string }

export default function AssetPhoto({ path, alt, className = 'h-12 w-12' }: Props) {
  const { data: url, isLoading } = usePhotoUrl(path)
  if (path && isLoading) return <Skeleton className={className} />
  if (!path || !url) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 ${className}`} aria-label="Tidak ada foto">
        <ImageOff size={18} />
      </div>
    )
  }
  return <img src={url} alt={alt} loading="lazy" className={`rounded-xl object-cover ${className}`} />
}
