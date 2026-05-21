'use client'

import { useRouter } from 'next/navigation'
import { PlatformIcon } from '@/components/platform-icons'
import type { CalendarPost } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface PlatformPostRowProps {
  post: CalendarPost
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  approved:   { text: 'Approved',   cls: 'text-green-700' },
  queued:     { text: 'Queued',     cls: 'text-purple-700' },
  publishing: { text: 'Publishing', cls: 'text-blue-700' },
  published:  { text: 'Published',  cls: 'text-zinc-500' },
  failed:     { text: 'Failed',     cls: 'text-red-700' },
  draft:      { text: 'Draft',      cls: 'text-zinc-400' },
  review:     { text: 'In Review',  cls: 'text-amber-700' },
}

export function PlatformPostRow({ post }: PlatformPostRowProps) {
  const router = useRouter()
  const status = STATUS_LABEL[post.status] ?? STATUS_LABEL.draft

  return (
    <button
      onClick={() => router.push(`/studio/${post.id}`)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left',
        'bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-zinc-300',
        'transition-all cursor-pointer'
      )}
    >
      <PlatformIcon platform={post.platform} size={18} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-zinc-800 capitalize">
          {post.platform.replace(/_/g, ' ')}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{post.accountName}</p>
      </div>
      <span className={cn('text-[9px] font-bold uppercase tracking-wide', status.cls)}>
        {status.text}
      </span>
      <span className="text-zinc-300 text-xs">›</span>
    </button>
  )
}
