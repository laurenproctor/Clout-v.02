'use client'

import { cn } from '@/lib/utils'
import type { InstagramSlide, InstagramVisualStyle } from '@/lib/instagram/types'

const ROLE_LABELS: Record<string, string> = {
  hook:         'Hook',
  insight:      'Insight',
  supporting:   'Supporting',
  cta:          'CTA',
  situation:    'Situation',
  tension:      'Tension',
  discovery:    'Discovery',
  lesson:       'Lesson',
  takeaway:     'Takeaway',
  data:         'Data',
  implication:  'Implication',
  so_what:      'So What',
  step:         'Step',
  problem:      'Problem',
  summary:      'Summary',
  context:      'Context',
}

const STYLE_BG: Record<InstagramVisualStyle, string> = {
  editorial: 'bg-zinc-50',
  founder:   'bg-stone-50',
  luxury:    'bg-slate-50',
  modern:    'bg-sky-50',
  minimal:   'bg-white',
  bold:      'bg-zinc-900',
  auto:      'bg-zinc-50',
}

const STYLE_TEXT: Record<InstagramVisualStyle, string> = {
  editorial: 'text-zinc-800',
  founder:   'text-stone-800',
  luxury:    'text-slate-700',
  modern:    'text-sky-900',
  minimal:   'text-zinc-700',
  bold:      'text-white',
  auto:      'text-zinc-800',
}

interface CarouselPreviewProps {
  slides: InstagramSlide[]
  resolvedStyle: InstagramVisualStyle
  resolvedFormat: string
}

export function CarouselPreview({ slides, resolvedStyle, resolvedFormat }: CarouselPreviewProps) {
  if (!slides.length) return null

  const bgClass   = STYLE_BG[resolvedStyle] ?? 'bg-zinc-50'
  const textClass = STYLE_TEXT[resolvedStyle] ?? 'text-zinc-800'
  const isQuote   = resolvedFormat === 'quote_graphic'

  if (isQuote && slides[0]) {
    return (
      <div>
        <p className="text-xs font-medium text-zinc-500 mb-2">Carousel Preview</p>
        <div
          className={cn(
            'rounded-lg border border-zinc-200 aspect-square flex flex-col items-center justify-center p-6 max-w-xs mx-auto',
            bgClass,
          )}
        >
          <p className={cn('text-sm font-medium text-center leading-snug', textClass)}>
            {slides[0].headline}
          </p>
          {slides[0].body && (
            <p className={cn('text-xs mt-2 text-center opacity-60', textClass)}>
              {slides[0].body}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-2">
        Carousel Preview
        <span className="ml-1.5 text-zinc-300">·</span>
        <span className="ml-1.5 text-zinc-400">{slides.length} slides</span>
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {slides.map((slide) => (
          <div
            key={slide.position}
            className={cn(
              'rounded-md border border-zinc-200 aspect-square p-2 flex flex-col justify-between overflow-hidden',
              bgClass,
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn('text-[9px] font-mono opacity-40', textClass)}>
                {slide.position}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-zinc-400 border border-zinc-200 rounded-full px-1 py-0.5 leading-none">
                {ROLE_LABELS[slide.role] ?? slide.role}
              </span>
            </div>
            <p className={cn('text-[10px] font-semibold leading-tight line-clamp-3 mt-auto', textClass)}>
              {slide.headline}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
