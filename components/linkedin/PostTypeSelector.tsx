'use client'

import { cn } from '@/lib/utils'
import { POST_TYPES } from '@/lib/linkedin/postTypes'
import type { LinkedInPostType } from '@/lib/linkedin/types'

interface PostTypeSelectorProps {
  selected: LinkedInPostType | undefined
  onChange: (type: LinkedInPostType) => void
}

export function PostTypeSelector({ selected, onChange }: PostTypeSelectorProps) {
  const activeTypes = POST_TYPES.filter(p => p.status === 'active')
  const comingSoonTypes = POST_TYPES.filter(p => p.status === 'coming_soon')

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
              onClick={() => onChange(post.id)}
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
    </div>
  )
}
