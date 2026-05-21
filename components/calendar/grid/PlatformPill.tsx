import { PlatformIcon } from '@/components/platform-icons'
import type { CalendarPost } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface PlatformPillProps {
  post: CalendarPost
}

const STATUS_STYLES: Record<
  string,
  { pill: string; label: string; text: string }
> = {
  approved:   { pill: 'border-green-200 bg-green-50',   label: 'Approved', text: 'text-green-700' },
  queued:     { pill: 'border-purple-200 bg-purple-50', label: 'Queued',   text: 'text-purple-700' },
  publishing: { pill: 'border-blue-200 bg-blue-50',     label: 'Publishing', text: 'text-blue-700' },
  published:  { pill: 'border-zinc-200 bg-zinc-50',     label: 'Published', text: 'text-zinc-500' },
  failed:     { pill: 'border-red-200 bg-red-50',       label: 'Failed',   text: 'text-red-700' },
  draft:      { pill: 'border-zinc-200 bg-white',       label: 'Draft',    text: 'text-zinc-400' },
  review:     { pill: 'border-amber-200 bg-amber-50',   label: 'Review',   text: 'text-amber-700' },
  archived:   { pill: 'border-zinc-100 bg-zinc-50',     label: 'Archived', text: 'text-zinc-300' },
}

export function PlatformPill({ post }: PlatformPillProps) {
  const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 flex-shrink-0 rounded-md border px-1.5 py-1',
        'cursor-pointer transition-shadow hover:shadow-sm',
        style.pill
      )}
    >
      <PlatformIcon platform={post.platform} size={14} />
      <div className="flex flex-col gap-0">
        <span className="text-[9px] font-semibold text-zinc-600 whitespace-nowrap max-w-[72px] truncate leading-tight">
          {post.accountName}
        </span>
        <span className={cn('text-[8px] font-bold uppercase tracking-wide leading-tight', style.text)}>
          {style.label}
        </span>
      </div>
    </div>
  )
}
