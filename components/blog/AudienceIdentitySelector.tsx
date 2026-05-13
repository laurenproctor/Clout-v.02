'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { BlogGenerationRequest } from '@/lib/blog/types'

const OPTIONS: Array<{ value: BlogGenerationRequest['audienceIdentity']; label: string }> = [
  { value: 'founder', label: 'Founder' },
  { value: 'executive', label: 'Executive' },
  { value: 'operator', label: 'Operator' },
  { value: 'investor', label: 'Investor' },
  { value: 'strategist', label: 'Strategist' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'creator', label: 'Creator' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'mass_appeal', label: 'Mass Appeal' },
  { value: 'custom', label: 'Custom' },
]

interface AudienceIdentitySelectorProps {
  value: BlogGenerationRequest['audienceIdentity']
  customValue?: string
  onChange: (value: BlogGenerationRequest['audienceIdentity']) => void
  onCustomChange: (text: string) => void
}

export function AudienceIdentitySelector({ value, customValue, onChange, onCustomChange }: AudienceIdentitySelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value === 'custom') inputRef.current?.focus()
  }, [value])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              value === opt.value
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <input
          ref={inputRef}
          type="text"
          value={customValue ?? ''}
          onChange={e => onCustomChange(e.target.value)}
          placeholder="e.g. early-career product managers at B2B SaaS companies"
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      )}
    </div>
  )
}
