'use client'

import { useState, useRef } from 'react'
import { Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BOARD_IMAGES } from '@/components/brand/example-board'
import type { TypographySettings, TypographyLevelSettings } from '@/types/typography'

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
  logoUrl?: string | null
  brandName?: string | null
  headingFont?: string
  bodyFont?: string
  typographySettings?: TypographySettings
  activeCard?: 'hero' | 'story' | 'tile'
  onCardSelect?: (card: 'hero' | 'story' | 'tile') => void
  className?: string
}

function resolvePreviewImages(imagery: ImagerySettings): string[] {
  const images: string[] = []
  images.push(...imagery.uploaded_imagery)
  for (const entry of imagery.example_board) {
    if (entry.startsWith('http')) {
      images.push(entry)
    } else {
      const match = BOARD_IMAGES.find(b => b.id === entry)
      if (match) images.push(match.url.replace('w=400', 'w=800'))
    }
  }
  return images
}

function resolveTextTransform(t: string): React.CSSProperties['textTransform'] {
  if (t === 'sentence-case') return 'none'
  if (t === 'title-case') return 'capitalize'
  return t as React.CSSProperties['textTransform']
}

function applyTypo(
  level: TypographyLevelSettings | undefined,
  fallbackFont: string,
  fallbackColor: string,
): React.CSSProperties {
  if (!level) return { fontFamily: fallbackFont, color: fallbackColor }
  return {
    fontFamily: level.fontFamily ? `"${level.fontFamily}", sans-serif` : fallbackFont,
    fontWeight: level.fontWeight,
    lineHeight: level.lineHeight,
    letterSpacing: level.letterSpacing,
    textTransform: resolveTextTransform(level.textTransform),
    color: level.color || fallbackColor,
  }
}

export function ImageryPreview({
  imagery,
  primaryColor,
  secondaryColor,
  accentColor,
  logoUrl,
  brandName,
  headingFont = 'serif',
  bodyFont = 'sans-serif',
  typographySettings,
  activeCard = 'hero',
  onCardSelect,
  className,
}: ImageryPreviewProps) {
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

  const previewImages = resolvePreviewImages(imagery)
  function imageFor(index: number): string | null {
    if (previewImages.length === 0) return null
    return previewImages[index % previewImages.length]
  }

  // Resolved font strings ready for CSS fontFamily
  const resolvedHeadingFont = `"${headingFont}", serif`
  const resolvedBodyFont = `"${bodyFont}", sans-serif`

  const cardProps = {
    imagery,
    primaryColor,
    secondaryColor,
    accentColor,
    scheme,
    logoUrl: logoUrl ?? null,
    brandName: brandName ?? '',
    headingFont: resolvedHeadingFont,
    bodyFont: resolvedBodyFont,
    typographySettings,
  }

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

  function goPrev() {
    scrollToIndex((activeIndex - 1 + cards.length) % cards.length)
  }
  function goNext() {
    scrollToIndex((activeIndex + 1) % cards.length)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar: arrows + label + dark/light toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-xs font-medium text-zinc-600 min-w-[80px] text-center">
            {cards[activeIndex].label}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            aria-label="Next card"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

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
        {cards.map((card, i) => (
          <div key={card.id} className="shrink-0 w-full snap-start overflow-hidden">
            {card.id === 'hero'  && <HeroBanner  {...cardProps} previewImage={imageFor(i)} />}
            {card.id === 'story' && <StoryCard   {...cardProps} previewImage={imageFor(i)} />}
            {card.id === 'tile'  && <PostTile    {...cardProps} previewImage={imageFor(i)} />}
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

      {previewImages.length === 0 && (
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
  logoUrl: string | null
  brandName: string
  headingFont: string
  bodyFont: string
  typographySettings?: TypographySettings
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

function LogoBadge({ logoUrl, brandName, bodyFont, isDark }: { logoUrl: string | null; brandName: string; bodyFont: string; isDark: boolean }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={brandName}
        style={{
          height: 22,
          maxWidth: 88,
          objectFit: 'contain',
          filter: isDark
            ? 'brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.5))'
            : 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))',
        }}
      />
    )
  }
  if (brandName) {
    return (
      <span style={{
        fontFamily: bodyFont,
        fontSize: '0.6rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)',
        textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 2px rgba(255,255,255,0.8)',
      }}>
        {brandName}
      </span>
    )
  }
  return null
}

function HeroBanner({ imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage, logoUrl, brandName, headingFont, bodyFont, typographySettings }: CardProps) {
  const overlay  = getOverlayText(imagery.overlay_text_style)
  const isDark   = scheme === 'dark'
  const textColor = isDark ? '#ffffff' : primaryColor
  const bg       = isDark ? primaryColor : `${accentColor}22`

  const compAlign: React.CSSProperties = (() => {
    switch (imagery.composition) {
      case 'Asymmetrical': return { justifyContent: 'flex-end', paddingLeft: '40%' }
      case 'Whitespace':   return { justifyContent: 'flex-start', alignItems: 'flex-end' }
      case 'Cinematic':    return { justifyContent: 'flex-end', alignItems: 'center' }
      default:             return { justifyContent: 'center', alignItems: 'center' }
    }
  })()

  const textShadow = previewImage
    ? (isDark ? '0 1px 4px rgba(0,0,0,0.7)' : '0 1px 3px rgba(255,255,255,0.6)')
    : undefined

  return (
    <div style={{ height: 200, width: '100%', position: 'relative', overflow: 'hidden', background: bg }}>
      {/* Photo layer */}
      {previewImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewImage}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Overlay */}
      {previewImage ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.2) 100%)'
            : 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.1) 100%)',
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
              {i === 0 && overlay && (
                <span style={{ fontFamily: headingFont, color: textColor, fontSize: '0.6rem', fontWeight: 700, padding: 4, textAlign: 'center', textShadow }}>
                  {overlay.headline}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 16, ...compAlign }}>
          {overlay ? (
            <div style={{ maxWidth: '80%' }}>
              <div style={{
                ...applyTypo(typographySettings?.h2, headingFont, textColor),
                fontSize: imagery.overlay_text_style === 'Stat Callout' ? '2rem' : '0.9rem',
                lineHeight: 1.2,
                letterSpacing: imagery.overlay_text_style === 'Editorial Masthead' ? '0.15em' : undefined,
                textShadow,
              }}>
                {overlay.headline}
              </div>
              {overlay.sub && (
                <div style={{ fontFamily: bodyFont, fontSize: '0.6rem', color: textColor, opacity: 0.85, marginTop: 4, textShadow }}>
                  {overlay.sub}
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: 48, height: 3, background: accentColor, borderRadius: 2 }} />
          )}
        </div>
      )}

      {/* Logo — bottom left */}
      <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
        <LogoBadge logoUrl={logoUrl} brandName={brandName} bodyFont={bodyFont} isDark={isDark || !!previewImage} />
      </div>

      {/* Imagery type label — bottom right */}
      {imagery.imagery_type.length > 0 && (
        <div style={{ position: 'absolute', bottom: 10, right: 12, fontFamily: bodyFont, fontSize: '0.5rem', color: textColor, opacity: 0.7, letterSpacing: '0.1em', textTransform: 'uppercase', textShadow }}>
          {imagery.imagery_type.join(' · ')}
        </div>
      )}
    </div>
  )
}

function StoryCard({ imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage, logoUrl, brandName, headingFont, bodyFont, typographySettings }: CardProps) {
  const overlay  = getOverlayText(imagery.overlay_text_style)
  const isDark   = scheme === 'dark'
  const bg       = isDark ? primaryColor : secondaryColor
  const textColor = isDark ? '#ffffff' : primaryColor

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
        {/* Stronger bottom fade so text area blends cleanly */}
        {previewImage && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isDark
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.3) 100%)',
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

      {/* Bottom text + logo area */}
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `1px solid ${accentColor}33`, boxSizing: 'border-box', background: bg }}>
        <div>
          {overlay ? (
            <>
              <div style={{ ...applyTypo(typographySettings?.h3, headingFont, textColor), fontSize: '0.75rem', lineHeight: 1.3 }}>{overlay.headline}</div>
              {overlay.sub && <div style={{ fontFamily: bodyFont, fontSize: '0.6rem', color: textColor, opacity: 0.6, marginTop: 2 }}>{overlay.sub}</div>}
            </>
          ) : (
            <>
              <div style={{ width: 24, height: 2, background: accentColor, borderRadius: 2, marginBottom: 4 }} />
              <div style={{ fontFamily: bodyFont, fontSize: '0.65rem', color: textColor, opacity: 0.6 }}>Visual story</div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <LogoBadge logoUrl={logoUrl} brandName={brandName} bodyFont={bodyFont} isDark={isDark} />
        </div>
      </div>
    </div>
  )
}

function PostTile({ imagery, primaryColor, secondaryColor, accentColor, scheme, previewImage, logoUrl, brandName, headingFont, bodyFont, typographySettings }: CardProps) {
  const overlay  = getOverlayText(imagery.overlay_text_style)
  const isDark   = scheme === 'dark'
  const bg       = isDark ? primaryColor : `${accentColor}15`
  const textColor = isDark ? '#ffffff' : primaryColor

  const textShadow = previewImage
    ? (isDark ? '0 1px 4px rgba(0,0,0,0.7)' : '0 1px 3px rgba(255,255,255,0.7)')
    : undefined

  return (
    <div style={{ aspectRatio: '1', width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16, boxSizing: 'border-box', background: bg }}>
      {/* Photo layer */}
      {previewImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewImage}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {/* Stronger overlay for text legibility */}
      {previewImage && (
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)'
            : 'linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.5) 55%, rgba(255,255,255,0.05) 100%)',
        }} />
      )}

      {/* Top: accent bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: imagery.composition === 'Asymmetrical' ? 'flex-end' : 'flex-start' }}>
        <div style={{ width: 28, height: 3, background: accentColor, borderRadius: 2 }} />
      </div>

      {/* Middle: overlay text */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: imagery.composition === 'Whitespace' ? 'flex-start' : 'center' }}>
        {!previewImage && (
          <div style={{ position: 'absolute', top: '0%', right: '-5%', width: '40%', height: '40%', border: `1px solid ${accentColor}`, borderRadius: imagery.composition === 'Centered' ? '50%' : '4px', opacity: 0.3 }} />
        )}
        {overlay ? (
          <div style={{ maxWidth: '85%', textAlign: imagery.composition === 'Whitespace' ? 'left' : 'center' }}>
            <div style={{
              ...applyTypo(typographySettings?.h2, headingFont, textColor),
              fontSize: imagery.overlay_text_style === 'Stat Callout' ? '2.5rem' : '0.9rem',
              lineHeight: 1.2,
              textShadow,
            }}>
              {overlay.headline}
            </div>
            {overlay.sub && (
              <div style={{ fontFamily: bodyFont, fontSize: '0.6rem', color: textColor, opacity: 0.8, marginTop: 5, textShadow }}>
                {overlay.sub}
              </div>
            )}
          </div>
        ) : (
          !previewImage && <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${accentColor}`, opacity: 0.4 }} />
        )}
      </div>

      {/* Bottom: logo + style label */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <LogoBadge logoUrl={logoUrl} brandName={brandName} bodyFont={bodyFont} isDark={isDark || !!previewImage} />
        <span style={{ fontFamily: bodyFont, fontSize: '0.5rem', color: textColor, opacity: 0.6, letterSpacing: '0.12em', textTransform: 'uppercase', textShadow }}>
          {imagery.visual_styles[0] ?? 'Brand Imagery'}
        </span>
      </div>
    </div>
  )
}
