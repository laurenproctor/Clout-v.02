'use client'

import { cn } from '@/lib/utils'
import type { InstagramVisualFormat } from '@/lib/instagram/types'

interface FormatOption {
  id: InstagramVisualFormat
  label: string
  description: string
  recommended?: boolean
  thumbnail: React.ReactNode
}

const CarouselThumb = () => (
  <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="2" y="2" width="56" height="10" rx="1" fill="currentColor" opacity="0.85" />
    <rect x="2" y="15" width="56" height="6" rx="1" fill="currentColor" opacity="0.4" />
    <rect x="2" y="24" width="40" height="6" rx="1" fill="currentColor" opacity="0.4" />
    <rect x="2" y="33" width="50" height="6" rx="1" fill="currentColor" opacity="0.25" />
  </svg>
)

const QuoteThumb = () => (
  <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <text x="6" y="18" fontSize="22" fill="currentColor" opacity="0.3" fontFamily="Georgia, serif">&ldquo;</text>
    <rect x="14" y="14" width="32" height="4" rx="1" fill="currentColor" opacity="0.7" />
    <rect x="18" y="21" width="24" height="4" rx="1" fill="currentColor" opacity="0.7" />
    <text x="42" y="36" fontSize="22" fill="currentColor" opacity="0.3" fontFamily="Georgia, serif">&rdquo;</text>
  </svg>
)

const FrameworkThumb = () => (
  <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="2" y="16" width="14" height="12" rx="2" fill="currentColor" opacity="0.6" />
    <rect x="23" y="16" width="14" height="12" rx="2" fill="currentColor" opacity="0.6" />
    <rect x="44" y="16" width="14" height="12" rx="2" fill="currentColor" opacity="0.6" />
    <path d="M16 22 L23 22" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    <path d="M37 22 L44 22" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    <path d="M21 20 L23 22 L21 24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    <path d="M42 20 L44 22 L42 24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
  </svg>
)

const NarrativeThumb = () => (
  <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <rect
        key={i}
        x={2 + i * 10}
        y={34 - i * 4}
        width="8"
        height={10 + i * 4}
        rx="1"
        fill="currentColor"
        opacity={0.15 + i * 0.14}
      />
    ))}
  </svg>
)

const DataThumb = () => (
  <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="8"  y="22" width="10" height="18" rx="1" fill="currentColor" opacity="0.5" />
    <rect x="25" y="12" width="10" height="28" rx="1" fill="currentColor" opacity="0.75" />
    <rect x="42" y="18" width="10" height="22" rx="1" fill="currentColor" opacity="0.6" />
    <line x1="4" y1="41" x2="56" y2="41" stroke="currentColor" strokeWidth="1" opacity="0.3" />
  </svg>
)

const AutoThumb = () => (
  <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path d="M30 8 L32.4 16.8 L41.6 14.4 L35.4 21.4 L41.6 28.4 L32.4 26 L30 34.8 L27.6 26 L18.4 28.4 L24.6 21.4 L18.4 14.4 L27.6 16.8 Z"
      fill="currentColor" opacity="0.7" />
  </svg>
)

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'let_clout_decide',
    label: 'Let Clout Decide',
    description: 'Automatically select the strongest format for this content.',
    recommended: true,
    thumbnail: <AutoThumb />,
  },
  {
    id: 'educational_carousel',
    label: 'Educational Carousel',
    description: 'Hook, insights, and CTA across 6 slides.',
    thumbnail: <CarouselThumb />,
  },
  {
    id: 'quote_graphic',
    label: 'Quote Graphic',
    description: 'A memorable idea, quote, or observation.',
    thumbnail: <QuoteThumb />,
  },
  {
    id: 'framework',
    label: 'Framework',
    description: 'Visualize a methodology, process, or model.',
    thumbnail: <FrameworkThumb />,
  },
  {
    id: 'narrative_story',
    label: 'Narrative Story',
    description: 'Story-driven carousel: hook → tension → discovery.',
    thumbnail: <NarrativeThumb />,
  },
  {
    id: 'data_insight',
    label: 'Data Insight',
    description: 'Statistics, trends, and supporting evidence.',
    thumbnail: <DataThumb />,
  },
]

interface VisualFormatSelectorProps {
  selected: InstagramVisualFormat | undefined
  onChange: (format: InstagramVisualFormat) => void
}

export function VisualFormatSelector({ selected, onChange }: VisualFormatSelectorProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Visual Format
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FORMAT_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'border rounded-xl p-3 cursor-pointer transition-all text-left relative',
                isSelected
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white',
              )}
            >
              {opt.recommended && (
                <span className="absolute top-2 right-2 text-[9px] font-medium uppercase tracking-wider text-zinc-400 border border-zinc-200 rounded-full px-1.5 py-0.5">
                  Default
                </span>
              )}
              <div
                className={cn(
                  'w-full h-11 mb-2.5 flex items-center justify-center rounded-md',
                  isSelected ? 'text-zinc-800' : 'text-zinc-400',
                )}
              >
                {opt.thumbnail}
              </div>
              <div className={cn('text-xs font-semibold mb-0.5', isSelected ? 'text-zinc-900' : 'text-zinc-700')}>
                {opt.label}
              </div>
              <div className="text-[11px] text-zinc-400 leading-relaxed">
                {opt.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
