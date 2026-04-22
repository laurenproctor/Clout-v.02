'use client'

import { Sparkles, X } from 'lucide-react'
import type { SuggestionBlock } from '@/hooks/use-ai-actions'

interface Props {
  block: SuggestionBlock
  onApply: (block: SuggestionBlock) => void
  onDismiss: (id: string) => void
}

export function InlineSuggestion({ block, onApply, onDismiss }: Props) {
  return (
    <div className="rounded-lg border border-indigo-800/50 bg-indigo-950/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-800/40">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
            {block.label}
          </span>
        </div>
        <button
          onClick={() => onDismiss(block.id)}
          className="text-indigo-700 hover:text-indigo-400 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap">
          {block.suggestion}
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-indigo-800/40">
        <button
          onClick={() => onApply(block)}
          className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          Apply
        </button>
        <button
          onClick={() => onDismiss(block.id)}
          className="rounded-md px-4 py-1.5 text-xs text-indigo-600 hover:text-indigo-400 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
