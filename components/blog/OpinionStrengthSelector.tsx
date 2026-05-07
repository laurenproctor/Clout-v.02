'use client'

import { cn } from '@/lib/utils'
import type { BlogGenerationRequest } from '@/lib/blog/types'

const OPTIONS: Array<{ value: BlogGenerationRequest['opinionStrength']; label: string; description: string }> = [
  { value: 'safe', label: 'Safe', description: 'Balanced, credibility-first' },
  { value: 'assertive', label: 'Assertive', description: 'Clear positions, confident' },
  { value: 'provocative', label: 'Provocative', description: 'Challenges assumptions' },
  { value: 'industry_challenging', label: 'Challenger', description: 'Directly challenges industry' },
]

interface OpinionStrengthSelectorProps {
  value: BlogGenerationRequest['opinionStrength']
  onChange: (value: BlogGenerationRequest['opinionStrength']) => void
}

export function OpinionStrengthSelector({ value, onChange }: OpinionStrengthSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md border px-2.5 py-2 text-left transition-colors',
            value === opt.value
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
          )}
        >
          <div className="text-xs font-medium">{opt.label}</div>
          <div className={cn('text-xs mt-0.5', value === opt.value ? 'text-zinc-300' : 'text-zinc-400')}>
            {opt.description}
          </div>
        </button>
      ))}
    </div>
  )
}
