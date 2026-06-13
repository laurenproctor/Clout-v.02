'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { PlatformIcon } from '@/components/platform-icons'
import { useWorkspace } from '@/components/providers/workspace-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RescheduleControl } from '@/components/publishing/RescheduleControl'
import type { CalendarPost } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface PlatformPostRowProps {
  post: CalendarPost
  onChanged?: () => void
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

export function PlatformPostRow({ post, onChanged }: PlatformPostRowProps) {
  const router = useRouter()
  const { slug } = useWorkspace()
  const status = STATUS_LABEL[post.status] ?? STATUS_LABEL.draft
  const isQueued = post.status === 'queued'

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleUnschedule() {
    setBusy(true)
    const res = await fetch(`/api/outputs/${post.id}/unschedule`, { method: 'POST' })
    setBusy(false)
    if (res.ok) onChanged?.()
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/outputs/${post.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteOpen(false)
    if (res.ok) onChanged?.()
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg',
        'bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-zinc-300',
        'transition-all'
      )}
    >
      <button
        onClick={() => router.push(`/${slug}/studio/${post.id}`)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
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
      </button>

      {isQueued ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              aria-label="More actions"
              disabled={busy}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[150px]">
            <DropdownMenuItem
              className="text-[13px] cursor-pointer"
              onSelect={() => router.push(`/${slug}/studio/${post.id}`)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[13px] cursor-pointer"
              onSelect={() => setRescheduleOpen(true)}
            >
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[13px] cursor-pointer"
              onSelect={() => void handleUnschedule()}
            >
              Move to Ready
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[13px] cursor-pointer text-red-600 focus:text-red-600"
              onSelect={() => setDeleteOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-zinc-300 text-xs">›</span>
      )}

      <RescheduleControl
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        outputId={post.id}
        initialScheduledAt={post.scheduledAt}
        onRescheduled={() => onChanged?.()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete scheduled post?"
        body="This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
