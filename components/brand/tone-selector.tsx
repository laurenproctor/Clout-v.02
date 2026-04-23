'use client'

import { cn } from '@/lib/utils'

const TONE_TRAITS = [
  'Bold', 'Authoritative', 'Warm', 'Playful', 'Professional',
  'Intellectual', 'Conversational', 'Inspirational', 'Minimal',
  'Luxury', 'Energetic', 'Calm', 'Edgy', 'Approachable',
] as const

interface ToneSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function ToneSelector({ value, onChange, className }: ToneSelectorProps) {
  function toggle(trait: string) {
    if (value.includes(trait)) {
      onChange(value.filter(t => t !== trait))
    } else {
      onChange([...value, trait])
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tone Traits</label>
      <div className="flex flex-wrap gap-2">
        {TONE_TRAITS.map(trait => (
          <button
            key={trait}
            type="button"
            onClick={() => toggle(trait)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-all',
              value.includes(trait)
                ? 'border-zinc-800 bg-zinc-800 text-white'
                : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
            )}
          >
            {trait}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-zinc-400">{value.length} trait{value.length > 1 ? 's' : ''} selected</p>
      )}
    </div>
  )
}
