'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ChannelPlatform } from '@/types/domain'
import { PlatformIcon } from '@/components/platform-icons'
import { cn } from '@/lib/utils'
import type { PreviewData } from './core/types'
import { SocialPreview } from './SocialPreview'

/**
 * Full-size, true-to-scale preview in a centered modal. Uses the centered Radix
 * Dialog pattern (like ui/confirm-dialog.tsx) — NOT a side Sheet — because the
 * preview should be centered, not edge-anchored.
 *
 * Optional platform tabs let the user switch between concept siblings inside the
 * modal. Tabs are hidden when there's a single platform.
 */

export interface PreviewPlatformTab {
  id: string
  platform: ChannelPlatform
  label: string
}

interface SocialPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PreviewData
  tabs?: PreviewPlatformTab[]
  activeTabId?: string
  onSelectTab?: (id: string) => void
}

export function SocialPreviewModal({
  open,
  onOpenChange,
  data,
  tabs,
  activeTabId,
  onSelectTab,
}: SocialPreviewModalProps) {
  const showTabs = (tabs?.length ?? 0) > 1

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'flex max-h-[90vh] w-auto max-w-[95vw] flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl',
          )}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-zinc-900">
              Post preview
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              A realistic, representative preview of how this post will appear when published.
            </Dialog.Description>
            <Dialog.Close
              aria-label="Close preview"
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          {showTabs && (
            <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 px-3 pt-2">
              {tabs!.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab?.(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border border-b-0 px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    activeTabId === tab.id
                      ? '-mb-px border-zinc-200 bg-white pb-[7px] text-zinc-900'
                      : 'border-transparent bg-zinc-50 text-zinc-400 hover:text-zinc-600',
                  )}
                >
                  <PlatformIcon platform={tab.platform} size={13} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-start justify-center overflow-auto bg-zinc-50 p-6">
            <SocialPreview data={data} mode="full" theme="light" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
