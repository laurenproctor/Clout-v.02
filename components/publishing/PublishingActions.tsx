'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface PublishingActionsProps {
  onSaveDraft: () => void
  onPublishNow: () => void
  onSchedule: (scheduledAt: Date) => void
  onQueue: () => void
  isSaving?: boolean
  isPublishing?: boolean
  savedAt?: Date | null
  disabled?: boolean
}

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function PublishingActions({
  onSaveDraft,
  onPublishNow,
  onSchedule,
  onQueue,
  isSaving,
  isPublishing,
  savedAt,
  disabled,
}: PublishingActionsProps) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')

  function handleConfirmSchedule() {
    if (!scheduleValue) return
    // Server (PATCH /api/outputs/[id]) snaps to the next workspace-tz slot.
    onSchedule(new Date(scheduleValue))
    setShowSchedule(false)
    setScheduleValue('')
  }

  return (
    <div className="border-t border-zinc-100">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-[13px] text-zinc-400">
          {savedAt ? `Saved ${relativeTime(savedAt)}` : 'Not saved'}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving || disabled}
            className="h-8 text-[13px] border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
          >
            {isSaving ? 'Saving…' : 'Save Draft'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={isPublishing || disabled}
                className="h-8 text-[13px] bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5"
              >
                {isPublishing ? 'Publishing…' : 'Publish'}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem
                className="text-[13px] cursor-pointer"
                onSelect={onPublishNow}
              >
                Post now
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-[13px] cursor-pointer"
                onSelect={() => setShowSchedule(true)}
              >
                Schedule
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-[13px] cursor-pointer"
                onSelect={onQueue}
              >
                Add to queue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showSchedule && (
        <div className="px-5 pb-4 bg-zinc-50 border-t border-zinc-100">
          <p className="text-[13px] font-medium text-zinc-600 mb-2.5 pt-3">Schedule for</p>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleValue}
              onChange={e => setScheduleValue(e.target.value)}
              className="flex-1 text-[13px] border border-zinc-200 rounded-md px-2.5 py-1.5 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <button
              onClick={handleConfirmSchedule}
              disabled={!scheduleValue}
              className="text-[13px] font-medium text-zinc-900 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => { setShowSchedule(false); setScheduleValue('') }}
              className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
