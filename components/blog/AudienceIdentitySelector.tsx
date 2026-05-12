'use client'

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
]

interface AudienceIdentitySelectorProps {
  value: BlogGenerationRequest['audienceIdentity']
  onChange: (value: BlogGenerationRequest['audienceIdentity']) => void
}

export function AudienceIdentitySelector({ value, onChange }: AudienceIdentitySelectorProps) {
  return (
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
  )
}
