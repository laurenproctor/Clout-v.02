'use client'

import { cn } from '@/lib/utils'

export interface ImagerySettings {
  visual_styles: string[]
  imagery_type: string | null
  composition: string | null
  overlay_text_style: string | null
  mood_traits: string[]
  negative_rules: string[]
  example_board: string[]
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

export function ImageryPreview({
  imagery,
  primaryColor,
  secondaryColor,
  accentColor,
  activeCard = 'hero',
  onCardSelect,
  className,
}: ImageryPreviewProps) {
  const tabs = [
    { id: 'hero' as const, label: 'Hero Banner' },
    { id: 'story' as const, label: 'Story Card' },
    { id: 'tile' as const, label: 'Post Tile' },
  ]

  const cardProps = { imagery, primaryColor, secondaryColor, accentColor }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onCardSelect?.(tab.id)}
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium transition-colors',
              activeCard === tab.id ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm overflow-hidden shadow-md rounded-lg">
        {activeCard === 'hero'  && <HeroBanner  {...cardProps} />}
        {activeCard === 'story' && <StoryCard   {...cardProps} />}
        {activeCard === 'tile'  && <PostTile    {...cardProps} />}
      </div>
    </div>
  )
}

type CardProps = {
  imagery: ImagerySettings
  primaryColor: string
  secondaryColor: string
  accentColor: string
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

function HeroBanner({ imagery, primaryColor, secondaryColor, accentColor }: CardProps) {
  const overlay = getOverlayText(imagery.overlay_text_style)
  const isGrid = imagery.composition === 'Grid'
  const isDark = imagery.mood_traits.includes('Serious') || imagery.mood_traits.includes('Bold') || imagery.visual_styles.includes('Editorial') || imagery.visual_styles.includes('Luxury')
  const bg = isDark ? primaryColor : `${accentColor}22`
  const textColor = isDark ? secondaryColor : primaryColor

  const compAlign: React.CSSProperties = (() => {
    switch (imagery.composition) {
      case 'Asymmetrical': return { justifyContent: 'flex-end', paddingLeft: '40%' }
      case 'Whitespace':   return { justifyContent: 'flex-start', alignItems: 'flex-end' }
      case 'Cinematic':    return { justifyContent: 'flex-end', alignItems: 'center' }
      default:             return { justifyContent: 'center', alignItems: 'center' }
    }
  })()

  return (
    <div style={{ height: 180, width: '100%', background: bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '55%', height: '160%', background: accentColor, opacity: isDark ? 0.18 : 0.25, transform: 'rotate(-12deg)' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '15%', width: '35%', height: '80%', background: accentColor, opacity: 0.1, transform: 'rotate(8deg)' }} />

      {isGrid ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: '100%', width: '100%' }}>
          {([accentColor, `${accentColor}88`, `${accentColor}55`, primaryColor] as string[]).map((c, i) => (
            <div key={i} style={{ background: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i === 0 && overlay && <span style={{ color: secondaryColor, fontSize: '0.6rem', fontWeight: 700, padding: 4, textAlign: 'center' }}>{overlay.headline}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 24, ...compAlign }}>
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

      {imagery.imagery_type && (
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '0.55rem', color: textColor, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {imagery.imagery_type}
        </div>
      )}
    </div>
  )
}

function StoryCard({ imagery, primaryColor, secondaryColor, accentColor }: CardProps) {
  const overlay = getOverlayText(imagery.overlay_text_style)
  const isPremium = imagery.mood_traits.includes('Premium') || imagery.visual_styles.includes('Luxury')
  const bg = isPremium ? primaryColor : secondaryColor
  const textColor = isPremium ? secondaryColor : primaryColor

  return (
    <div style={{ height: 320, width: '100%', background: bg, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 2, position: 'relative', background: `linear-gradient(135deg, ${accentColor}44 0%, ${accentColor}11 100%)` }}>
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: '40%', height: '40%', borderRadius: '50%', background: accentColor, opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '55%', height: '55%', borderRadius: '50%', border: `2px solid ${accentColor}`, opacity: 0.3 }} />
        {imagery.composition === 'Asymmetrical' && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: accentColor }} />
        )}
      </div>
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, borderTop: `1px solid ${accentColor}22`, boxSizing: 'border-box' }}>
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

function PostTile({ imagery, primaryColor, secondaryColor, accentColor }: CardProps) {
  const overlay = getOverlayText(imagery.overlay_text_style)
  const isCalm = imagery.mood_traits.includes('Calm') || imagery.mood_traits.includes('Intellectual')
  const bg = isCalm ? `${accentColor}15` : primaryColor
  const textColor = isCalm ? primaryColor : secondaryColor

  return (
    <div style={{ aspectRatio: '1', width: '100%', background: bg, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: imagery.composition === 'Asymmetrical' ? 'flex-end' : 'flex-start' }}>
        <div style={{ width: 32, height: 3, background: accentColor, borderRadius: 2 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: imagery.composition === 'Whitespace' ? 'flex-start' : 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '0%', right: '-5%', width: '40%', height: '40%', border: `1px solid ${accentColor}`, borderRadius: imagery.composition === 'Centered' ? '50%' : '4px', opacity: 0.3 }} />
        {overlay ? (
          <div style={{ maxWidth: '80%', textAlign: imagery.composition === 'Whitespace' ? 'left' : 'center' }}>
            <div style={{ fontSize: imagery.overlay_text_style === 'Stat Callout' ? '2.5rem' : '0.85rem', fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
              {overlay.headline}
            </div>
            {overlay.sub && <div style={{ fontSize: '0.6rem', color: textColor, opacity: 0.6, marginTop: 6 }}>{overlay.sub}</div>}
          </div>
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${accentColor}`, opacity: 0.4 }} />
        )}
      </div>
      <div style={{ fontSize: '0.6rem', color: textColor, opacity: 0.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {imagery.visual_styles[0] ?? 'Brand Imagery'}
      </div>
    </div>
  )
}
