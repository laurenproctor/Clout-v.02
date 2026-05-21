'use client'

import { PlatformIcon } from '@/components/platform-icons'
import type { ChannelPlatform } from '@/types/domain'
import { cn } from '@/lib/utils'

interface PlatformTab {
  postId: string
  platform: ChannelPlatform
  accountName: string
  status: string
}

interface PlatformTabsProps {
  tabs: PlatformTab[]
  activePostId: string
  onSelectTab: (postId: string) => void
}

export function PlatformTabs({
  tabs,
  activePostId,
  onSelectTab,
}: PlatformTabsProps) {
  return (
    <div className="flex gap-1 border-b border-zinc-200 bg-white px-4 pt-3 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.postId}
          onClick={() => onSelectTab(tab.postId)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-semibold',
            'border border-b-0 transition-colors cursor-pointer whitespace-nowrap',
            activePostId === tab.postId
              ? 'bg-white border-zinc-200 text-zinc-900 -mb-px pb-[9px]'
              : 'bg-zinc-50 border-transparent text-zinc-400 hover:text-zinc-600'
          )}
        >
          <PlatformIcon platform={tab.platform} size={13} />
          <span>{tab.accountName}</span>
        </button>
      ))}
    </div>
  )
}
