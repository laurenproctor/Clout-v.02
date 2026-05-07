'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { HeadlineOption } from '@/lib/blog/types'

interface NarrativeCardProps {
  option: HeadlineOption
  isSelected: boolean
  onSelect: () => void
  openingHooks: string[]
  editable: boolean
}

const STYLE_BADGES: Record<HeadlineOption['style'], string> = {
  contrarian: 'Most Contrarian',
  'data-led': 'Data-Driven',
  narrative: 'Story-Led',
  question: 'Curiosity Hook',
  executive: 'Executive Frame',
}

export function NarrativeCard({ option, isSelected, onSelect, openingHooks, editable }: NarrativeCardProps) {
  const [showHooks, setShowHooks] = useState(false)

  return (
    <div
      onClick={() => editable && onSelect()}
      className={cn(
        'rounded-xl border p-6 transition-all cursor-pointer',
        isSelected
          ? 'border-zinc-900 bg-white shadow-sm ring-1 ring-zinc-900'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
        )}>
          {STYLE_BADGES[option.style]}
        </span>
        {isSelected && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="#18181b" />
              <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Selected
          </span>
        )}
      </div>

      <h3 className={cn(
        'text-sm font-semibold leading-snug mb-2',
        isSelected ? 'text-zinc-900' : 'text-zinc-800'
      )}>
        {option.title}
      </h3>

      <p className="text-xs text-zinc-400 leading-relaxed">
        {option.why}
      </p>

      {isSelected && openingHooks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Opening Hook</span>
            {openingHooks.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowHooks(!showHooks) }}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showHooks ? 'Show less' : `Show all ${openingHooks.length}`}
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-600 italic leading-relaxed">
            &ldquo;{openingHooks[0]}&rdquo;
          </p>
          {showHooks && openingHooks.slice(1).map((hook, i) => (
            <p key={i} className="text-xs text-zinc-600 italic leading-relaxed mt-2">
              &ldquo;{hook}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
