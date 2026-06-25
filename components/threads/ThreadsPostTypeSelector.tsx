'use client'

import { cn } from '@/lib/utils'
import { THREADS_POST_TYPES } from '@/lib/threads/postTypes'
import type { ThreadsPostType } from '@/lib/threads/types'

interface ThreadsPostTypeSelectorProps {
  selected: ThreadsPostType | undefined
  onChange: (type: ThreadsPostType) => void
  linkUrl?: string
  onLinkUrlChange: (url: string) => void
}

export function ThreadsPostTypeSelector({
  selected,
  onChange,
  linkUrl,
  onLinkUrlChange,
}: ThreadsPostTypeSelectorProps) {
  const activeTypes = THREADS_POST_TYPES.filter(p => p.status === 'active')
  const comingSoonTypes = THREADS_POST_TYPES.filter(p => p.status === 'coming_soon')

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Post Type</p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {activeTypes.map(post => {
          const Icon = post.icon
          const isSelected = selected === post.id
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onChange(post.id as ThreadsPostType)}
              className={cn(
                'border rounded-xl p-4 cursor-pointer transition-all text-left',
                isSelected
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              )}
            >
              <Icon size={20} className="text-zinc-600 mb-2" />
              <div className="text-sm font-semibold text-zinc-900">{post.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{post.description}</div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {comingSoonTypes.map(post => {
          const Icon = post.icon
          return (
            <div
              key={post.id}
              className="opacity-50 cursor-not-allowed border border-zinc-200 rounded-xl p-4"
              aria-disabled
            >
              <Icon size={20} className="text-zinc-600 mb-2" />
              <div className="text-sm font-semibold text-zinc-900">{post.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{post.description}</div>
              <span className="inline-block mt-2 text-[10px] text-zinc-400 border border-zinc-200 rounded-full px-2 py-0.5">
                Coming Soon
              </span>
            </div>
          )
        })}
      </div>

      {/* Link posts need a destination URL before generation. */}
      {selected === 'link' && (
        <div className="mt-3">
          <input
            type="url"
            value={linkUrl ?? ''}
            onChange={e => onLinkUrlChange(e.target.value)}
            placeholder="https://example.com/article-to-link"
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-zinc-400">Required for link posts — the post copy frames this URL.</p>
        </div>
      )}
    </div>
  )
}
