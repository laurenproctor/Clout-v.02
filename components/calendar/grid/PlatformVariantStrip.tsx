'use client'

import { PlatformPill } from './PlatformPill'
import type { CalendarPost } from '@/types/calendar'
import { useRouter } from 'next/navigation'

interface PlatformVariantStripProps {
  posts: CalendarPost[]
  maxVisible?: number
}

export function PlatformVariantStrip({
  posts,
  maxVisible = 4,
}: PlatformVariantStripProps) {
  const router = useRouter()
  const visible = posts.slice(0, maxVisible)
  const overflow = posts.length - maxVisible

  return (
    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
      {visible.map((post) => (
        <div
          key={post.id}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/studio/${post.id}`)
          }}
        >
          <PlatformPill post={post} />
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-md border border-dashed border-zinc-300 text-[9px] font-bold text-zinc-400 cursor-pointer hover:border-zinc-400">
          +{overflow}
        </div>
      )}
    </div>
  )
}
