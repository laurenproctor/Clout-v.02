'use client'

import { useState, useRef } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BOARD_IMAGES } from '@/components/brand/example-board'

export interface ImagerySettings {
  visual_styles: string[]
  imagery_type: string[]
  composition: string | null
  overlay_text_style: string | null
  mood_traits: string[]
  negative_rules: string[]
  example_board: string[]
  negative_example_board: string[]
  uploaded_imagery: string[]
  subjects: string[]
  generation_notes: string
}

interface ImageryPreviewProps {
  imagery: ImagerySettings
  primaryColor: string
  secondaryColor: string
  accentColor: string
  activeCard?: 'hero' | 'story' | 'tile'
  onCardSelect?: (card: 'hero' | 'story' | 'tile') => void
  className?: string
}

function resolvePreviewImage(imagery: ImagerySettings): string | null {
  if (imagery.uploaded_imagery.length > 0) return imagery.uploaded_imagery[0]
  if (imagery.example_board.length > 0) {
    // Dynamic results: stored as full URLs
    const directUrl = imagery.example_board.find(v => v.startsWith('http'))
    if (directUrl) return directUrl
    // Legacy: stored as IDs referencing BOARD_IMAGES
    const match = BOARD_IMAGES.find(b => imagery.example_board.includes(b.id))
    return match?.url.replace('w=400', 'w=800') ?? null
  }
  return null
}

export function ImageryPreview({
  imagery,
  primaryColor,
  secondaryColor,
  accentColor,
  activeCard = 'hero',
  onCardSelect,
  className,
}: ImageryPreviewProps) {
  // Default scheme based on mood/style signals; user can override with toggle
  const defaultScheme = (
    imagery.mood_traits.some(t => ['Serious', 'Bold', 'Premium'].includes(t)) ||
    imagery.visual_styles.some(s => ['Editorial', 'Luxury', 'Futuristic'].includes(s))
  ) ? 'dark' : 'light'

  const [scheme, setScheme] = useState<'light' | 'dark'>(defaultScheme)
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const cards = [
    { id: 'hero'  as const, label: 'Hero Banner' },
    { id: 'story' as const, label: 'Story Card' },
    { id: 'tile'  as const, label: 'Post Tile' },
  ]

  const previewImage = resolvePreviewImage(imagery)
  const cardProps = { imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage }

  function scrollToIndex(index: number) {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setActiveIndex(index)
    onCardSelect?.(cards[index].id)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    if (index !== activeIndex) {
      setActiveIndex(index)
      onCardSelect?.(cards[index].id)
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">{cards[activeIndex].label}</p>
        <button
          type="button"
          onClick={() => setScheme(s => s === 'dark' ? 'light' : 'dark')}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
          aria-label="Toggle dark/light preview"
          title={scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {scheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Scroll carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-lg shadow-md"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map(card => (
          <div key={card.id} className="shrink-0 w-full snap-start overflow-hidden">
            {card.id === 'hero'  && <HeroBanner  {...cardProps} />}
            {card.id === 'story' && <StoryCard   {...cardProps} />}
            {card.id === 'tile'  && <PostTile    {...cardProps} />}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5">
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={cn(
              'rounded-full transition-all',
              i === activeIndex ? 'w-4 h-1.5 bg-zinc-700' : 'w-1.5 h-1.5 bg-zinc-300 hover:bg-zinc-400'
            )}
            aria-label={`Show ${card.label}`}
          />
        ))}
      </div>

      {!previewImage && (
        <p className="text-[10px] text-zinc-400 text-center -mt-1">
          Upload imagery or select from the reference board to see it here.
        </p>
      )}
    </div>
  )
}

type CardProps = {
  imagery: ImagerySettings
  primaryColor: string
  secondaryColor: string
  accentColor: string
  scheme: 'light' | 'dark'
  previewImage: string | null
}

function getOverlayText(style: string | null): { headline: string; sub: string } | null {
  switch (style) {
    case 'Headline Overlay':   return { headline: 'The Future of Creative Work', sub: '' }
    case 'Quote Card':         return { headline: '"Clarity is the ultimate creative act."', sub: '— Brand Voice' }
    case 'Editorial Masthead': return { headline: 'VOL. 12 — SPRING ISSUE', sub: 'The Creative Direction Edition' }
    case 'Stat Callout':       return { headline: '87%', sub: 'of top brands define imagery first' }
    default:                   return null
  }
}

function HeroBanner({ imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage }: CardProps) {
  const overlay  = getOverlayText(imagery.overlay_text_style)
  const isDark   = scheme === 'dark'
  const textColor = isDark ? secondaryColor : primaryColor
  const bg       = isDark ? primaryColor : `${accentColor}22`

  const compAlign: React.CSSProperties = (() => {
    switch (imagery.composition) {
      case 'Asymmetrical': return { justifyContent: 'flex-end', paddingLeft: '40%' }
      case 'Whitespace':   return { justifyContent: 'flex-start', alignItems: 'flex-end' }
      case 'Cinematic':    return { justifyContent: 'flex-end', alignItems: 'center' }
      default:             return { justifyContent: 'center', alignItems: 'center' }
    }
  })()

  return (
    <div style={{ height: 180, width: '100%', position: 'relative', overflow: 'hidden', background: bg }}>
      {/* Photo layer */}
      {previewImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewImage}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Tint / gradient overlay */}
      {previewImage ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 100%)'
            : 'linear-gradient(to top, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.45) 55%, rgba(255,255,255,0.05) 100%)',
        }} />
      ) : (
        <>
          <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '55%', height: '160%', background: accentColor, opacity: isDark ? 0.18 : 0.25, transform: 'rotate(-12deg)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', left: '15%', width: '35%', height: '80%', background: accentColor, opacity: 0.1, transform: 'rotate(8deg)' }} />
        </>
      )}

      {/* Content */}
      {imagery.composition === 'Grid' ? (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2 }}>
          {([accentColor, `${accentColor}88`, `${accentColor}55`, primaryColor] as string[]).map((c, i) => (
            <div key={i} style={{ background: previewImage ? 'transparent' : c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i === 0 && overlay && <span style={{ color: isDark ? secondaryColor : primaryColor, fontSize: '0.6rem', fontWeight: 700, padding: 4, textAlign: 'center' }}>{overlay.headline}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, ...compAlign }}>
          {overlay ? (
            <div style={{ maxWidth: '75%' }}>
              <div style={{ fontSize: imagery.overlay_text_style === 'Stat Callout' ? '2rem' : '0.85rem', fontWeight: 700, color: textColor, lineHeight: 1.2, letterSpacing: imagery.overlay_text_style === 'Editorial Masthead' ? '0.15em' : undefined }}>
                {overlay.headline}
              </div>
              {overlay.sub && <div style={{ fontSize: '0.6rem', color: textColor, opacity: 0.7, marginTop: 4 }}>{overlay.sub}</div>}
            </div>
          ) : (
            <div style={{ width: 48, height: 3, background: accentColor, borderRadius: 2 }} />
          )}
        </div>
      )}

      {imagery.imagery_type.length > 0 && (
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '0.55rem', color: textColor, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {imagery.imagery_type.join(' · ')}
        </div>
      )}
    </div>
  )
}

function StoryCard({ imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage }: CardProps) {
  const overlay  = getOverlayText(imagery.overlay_text_style)
  const isDark   = scheme === 'dark'
  const bg       = isDark ? primaryColor : secondaryColor
  const textColor = isDark ? secondaryColor : primaryColor

  return (
    <div style={{ height: 320, width: '100%', background: bg, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Top image area */}
      <div style={{ flex: 2, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${accentColor}44 0%, ${accentColor}11 100%)` }}>
        {previewImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImage}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {/* Tint */}
        {previewImage && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
          }} />
        )}
        {!previewImage && (
          <>
            <div style={{ position: 'absolute', top: '15%', left: '10%', width: '40%', height: '40%', borderRadius: '50%', background: accentColor, opacity: 0.2 }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '55%', height: '55%', borderRadius: '50%', border: `2px solid ${accentColor}`, opacity: 0.3 }} />
          </>
        )}
        {imagery.composition === 'Asymmetrical' && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: accentColor }} />
        )}
      </div>

      {/* Bottom text area */}
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, borderTop: `1px solid ${accentColor}33`, boxSizing: 'border-box', background: bg }}>
        {overlay ? (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: textColor, lineHeight: 1.3 }}>{overlay.headline}</div>
            {overlay.sub && <div style={{ fontSize: '0.6rem', color: textColor, opacity: 0.6 }}>{overlay.sub}</div>}
          </>
        ) : (
          <>
            <div style={{ width: 24, height: 2, background: accentColor, borderRadius: 2 }} />
            <div style={{ fontSize: '0.7rem', color: textColor, opacity: 0.6 }}>Visual story</div>
          </>
        )}
      </div>
    </div>
  )
}

function PostTile({ imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage }: CardProps) {
  const overlay  = getOverlayText(imagery.overlay_text_style)
  const isDark   = scheme === 'dark'
  const bg       = isDark ? primaryColor : `${accentColor}15`
  const textColor = isDark ? secondaryColor : primaryColor

  return (
    <div style={{ aspectRatio: '1', width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, boxSizing: 'border-box', background: bg }}>
      {/* Photo layer */}
      {previewImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewImage}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {/* Tint */}
      {previewImage && (
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.05) 100%)'
            : 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0.0) 100%)',
        }} />
      )}

      {/* Content (above overlays via relative positioning) */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: imagery.composition === 'Asymmetrical' ? 'flex-end' : 'flex-start' }}>
        <div style={{ width: 32, height: 3, background: accentColor, borderRadius: 2 }} />
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: imagery.composition === 'Whitespace' ? 'flex-start' : 'center' }}>
        {!previewImage && (
          <div style={{ position: 'absolute', top: '0%', right: '-5%', width: '40%', height: '40%', border: `1px solid ${accentColor}`, borderRadius: imagery.composition === 'Centered' ? '50%' : '4px', opacity: 0.3 }} />
        )}
        {overlay ? (
          <div style={{ maxWidth: '80%', textAlign: imagery.composition === 'Whitespace' ? 'left' : 'center' }}>
            <div style={{ fontSize: imagery.overlay_text_style === 'Stat Callout' ? '2.5rem' : '0.85rem', fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
              {overlay.headline}
            </div>
            {overlay.sub && <div style={{ fontSize: '0.6rem', color: textColor, opacity: 0.6, marginTop: 6 }}>{overlay.sub}</div>}
          </div>
        ) : (
          !previewImage && <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${accentColor}`, opacity: 0.4 }} />
        )}
      </div>
      <div style={{ position: 'relative', fontSize: '0.6rem', color: textColor, opacity: 0.6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {imagery.visual_styles[0] ?? 'Brand Imagery'}
      </div>
    </div>
  )
}
