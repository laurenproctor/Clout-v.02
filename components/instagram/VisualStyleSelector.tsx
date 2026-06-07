'use client'

import { cn } from '@/lib/utils'
import type { InstagramVisualStyle } from '@/lib/instagram/types'

interface StyleOption {
  id: InstagramVisualStyle
  label: string
  description: string
  thumbnail: React.ReactNode
}

const FounderThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="4" y="8" width="28" height="3" rx="0.5" fill="currentColor" opacity="0.8" />
    <rect x="4" y="14" width="40" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
    <rect x="4" y="19" width="34" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
    <rect x="4" y="24" width="22" height="2" rx="0.5" fill="currentColor" opacity="0.25" />
  </svg>
)

const EditorialThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="10" y="6" width="40" height="5" rx="1" fill="currentColor" opacity="0.75" />
    <rect x="18" y="15" width="24" height="2.5" rx="0.5" fill="currentColor" opacity="0.4" />
    <rect x="22" y="20" width="16" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
    <line x1="10" y1="28" x2="50" y2="28" stroke="currentColor" strokeWidth="0.75" opacity="0.2" />
  </svg>
)

const LuxuryThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="16" y="12" width="28" height="3.5" rx="0.5" fill="currentColor" opacity="0.6" />
    <rect x="20" y="19" width="20" height="2" rx="0.5" fill="currentColor" opacity="0.35" />
  </svg>
)

const ModernThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="4" y="5" width="4" height="26" rx="0.5" fill="currentColor" opacity="0.7" />
    <rect x="12" y="9" width="36" height="4" rx="0.5" fill="currentColor" opacity="0.75" />
    <rect x="12" y="17" width="28" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
    <rect x="12" y="23" width="20" height="2.5" rx="0.5" fill="currentColor" opacity="0.3" />
  </svg>
)

const MinimalThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="14" y="15" width="32" height="4" rx="0.5" fill="currentColor" opacity="0.65" />
  </svg>
)

const BoldThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="2" y="2" width="56" height="32" rx="2" fill="currentColor" opacity="0.12" />
    <rect x="8" y="10" width="36" height="7" rx="1" fill="currentColor" opacity="0.8" />
    <rect x="8" y="21" width="24" height="4" rx="1" fill="currentColor" opacity="0.45" />
  </svg>
)

const AutoThumb = () => (
  <svg viewBox="0 0 60 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path
      d="M30 6 L31.8 13.2 L39.2 11.2 L34.4 17 L39.2 22.8 L31.8 20.8 L30 28 L28.2 20.8 L20.8 22.8 L25.6 17 L20.8 11.2 L28.2 13.2 Z"
      fill="currentColor"
      opacity="0.65"
    />
  </svg>
)

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Clout picks the right style',
    thumbnail: <AutoThumb />,
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Publication-grade',
    thumbnail: <EditorialThumb />,
  },
  {
    id: 'founder',
    label: 'Founder',
    description: 'Unpolished authority',
    thumbnail: <FounderThumb />,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Nothing but signal',
    thumbnail: <MinimalThumb />,
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Tech-forward clarity',
    thumbnail: <ModernThumb />,
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'Maximum impact',
    thumbnail: <BoldThumb />,
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Premium positioning',
    thumbnail: <LuxuryThumb />,
  },
]

interface VisualStyleSelectorProps {
  selected: InstagramVisualStyle | undefined
  onChange: (style: InstagramVisualStyle) => void
  disabled?: boolean
}

export function VisualStyleSelector({ selected, onChange, disabled }: VisualStyleSelectorProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Visual Style
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STYLE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !disabled && onChange(opt.id)}
              disabled={disabled}
              className={cn(
                'border rounded-lg p-2 cursor-pointer transition-all text-left',
                isSelected
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div
                className={cn(
                  'w-full h-9 mb-1.5 flex items-center justify-center',
                  isSelected ? 'text-zinc-800' : 'text-zinc-400',
                )}
              >
                {opt.thumbnail}
              </div>
              <div className={cn('text-[11px] font-semibold', isSelected ? 'text-zinc-900' : 'text-zinc-700')}>
                {opt.label}
              </div>
              <div className="text-[10px] text-zinc-400">
                {opt.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
