'use client'

import { cn } from '@/lib/utils'
import type { HookExploration, HeadlineOption } from '@/lib/blog/types'

interface HookExplorationCardProps {
  exploration: HookExploration
  selectedHeadline: string
  onSelect: (headline: string) => void
  editable: boolean
}

const STYLE_LABELS: Record<HeadlineOption['style'], string> = {
  contrarian: 'Contrarian',
  'data-led': 'Data-Led',
  narrative: 'Narrative',
  question: 'Question',
  executive: 'Executive',
}

export function HookExplorationCard({ exploration, selectedHeadline, onSelect, editable }: HookExplorationCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-1">Headline Options</h3>
      <p className="text-xs text-zinc-400 mb-4">{exploration.primaryAngle}</p>

      <div className="space-y-2">
        {exploration.headlineOptions.map((opt, i) => (
          <button
            key={i}
            type="button"
            disabled={!editable}
            onClick={() => editable && onSelect(opt.title)}
            className={cn(
              'w-full text-left rounded-lg border px-4 py-3 transition-colors',
              selectedHeadline === opt.title
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : editable
                ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                : 'border-zinc-100 bg-zinc-50 text-zinc-600 cursor-default'
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                selectedHeadline === opt.title ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
              )}>
                {STYLE_LABELS[opt.style]}
              </span>
              <span className={cn('text-xs', selectedHeadline === opt.title ? 'text-zinc-300' : 'text-zinc-400')}>
                {'★'.repeat(opt.strength)}{'☆'.repeat(5 - opt.strength)}
              </span>
            </div>
            <div className="text-sm font-medium leading-snug">{opt.title}</div>
            <div className={cn('text-xs mt-1', selectedHeadline === opt.title ? 'text-zinc-300' : 'text-zinc-400')}>
              {opt.why}
            </div>
          </button>
        ))}
      </div>

      {exploration.openingHooks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <p className="text-xs font-medium text-zinc-500 mb-2">Opening Hooks</p>
          <div className="space-y-1.5">
            {exploration.openingHooks.map((hook, i) => (
              <p key={i} className="text-xs text-zinc-600 italic">"{hook}"</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
