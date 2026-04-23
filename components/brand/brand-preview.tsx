'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface BrandSettings {
  brand_name: string | null
  logo_url?: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  font_heading: string
  font_body: string
  font_heading_url?: string
  font_body_url?: string
  tone_traits: string[]
  style_traits: {
    border_radius: 'none' | 'subtle' | 'balanced' | 'rounded' | 'pill'
    visual_density: 'compact' | 'balanced' | 'spacious'
    color_scheme: 'light' | 'dark'
    texture: 'none' | 'subtle' | 'medium' | 'bold'
  }
}

const RADIUS_MAP = {
  none: '0px',
  subtle: '4px',
  balanced: '8px',
  rounded: '16px',
  pill: '9999px',
}

const DENSITY_MAP = {
  compact: { padding: '12px 16px', gap: '8px' },
  balanced: { padding: '20px 24px', gap: '14px' },
  spacious: { padding: '28px 32px', gap: '20px' },
}

interface BrandPreviewProps {
  settings: BrandSettings
  activeCard?: 'quote' | 'tile' | 'carousel'
  onCardSelect?: (card: 'quote' | 'tile' | 'carousel') => void
  className?: string
}

export function BrandPreview({ settings, activeCard = 'quote', onCardSelect, className }: BrandPreviewProps) {
  const isDark = settings.style_traits.color_scheme === 'dark'
  const bg = isDark ? settings.primary_color : settings.secondary_color
  const text = isDark ? settings.secondary_color : settings.primary_color
  const accent = settings.accent_color
  const radius = RADIUS_MAP[settings.style_traits.border_radius]
  const density = DENSITY_MAP[settings.style_traits.visual_density]
  const headingFont = settings.font_heading_url
    ? `"CustomHeading", sans-serif`
    : `"${settings.font_heading}", serif`
  const bodyFont = settings.font_body_url
    ? `"CustomBody", sans-serif`
    : `"${settings.font_body}", sans-serif`

  useEffect(() => {
    if (settings.font_heading_url) {
      let style = document.getElementById('brand-heading-font') as HTMLStyleElement | null
      if (!style) {
        style = document.createElement('style')
        style.id = 'brand-heading-font'
        document.head.appendChild(style)
      }
      style.textContent = `@font-face { font-family: "CustomHeading"; src: url("${settings.font_heading_url}"); }`
    }
    if (settings.font_body_url) {
      let style = document.getElementById('brand-body-font') as HTMLStyleElement | null
      if (!style) {
        style = document.createElement('style')
        style.id = 'brand-body-font'
        document.head.appendChild(style)
      }
      style.textContent = `@font-face { font-family: "CustomBody"; src: url("${settings.font_body_url}"); }`
    }
  }, [settings.font_heading_url, settings.font_body_url])

  const brandName = settings.brand_name || 'Your Brand'

  const tabs = [
    { id: 'quote' as const, label: 'Quote Card' },
    { id: 'tile' as const, label: 'Social Tile' },
    { id: 'carousel' as const, label: 'Carousel Cover' },
  ]

  const cardProps = { bg, text, accent, radius, density, headingFont, bodyFont, brandName }

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

      <div className="aspect-square w-full max-w-sm overflow-hidden shadow-md" style={{ borderRadius: radius }}>
        {activeCard === 'quote' && <QuoteCard {...cardProps} />}
        {activeCard === 'tile' && <SocialTile {...cardProps} />}
        {activeCard === 'carousel' && <CarouselCover {...cardProps} />}
      </div>
    </div>
  )
}

type CardProps = {
  bg: string; text: string; accent: string; radius: string
  density: { padding: string; gap: string }
  headingFont: string; bodyFont: string; brandName: string
}

function QuoteCard({ bg, text, accent, density, headingFont, bodyFont, brandName }: CardProps) {
  return (
    <div style={{ background: bg, padding: density.padding, fontFamily: bodyFont, color: text, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
      <div style={{ width: 24, height: 3, background: accent, borderRadius: 2 }} />
      <blockquote style={{ fontFamily: headingFont, fontSize: 'clamp(1rem, 3vw, 1.5rem)', lineHeight: 1.4, color: text, margin: 0 }}>
        "The best ideas come from the intersection of discipline and curiosity."
      </blockquote>
      <div style={{ display: 'flex', alignItems: 'center', gap: density.gap }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: text }}>{brandName}</div>
          <div style={{ fontSize: '0.65rem', color: text, opacity: 0.6 }}>Thought of the day</div>
        </div>
      </div>
    </div>
  )
}

function SocialTile({ bg, text, accent, density, headingFont, bodyFont, brandName }: CardProps) {
  return (
    <div style={{ background: bg, fontFamily: bodyFont, color: text, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: headingFont, fontSize: '2rem', color: bg, fontWeight: 700 }}>01</span>
      </div>
      <div style={{ flex: 1, padding: density.padding, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <p style={{ fontFamily: headingFont, fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)', fontWeight: 600, color: text, margin: 0 }}>
          Building in public changes everything
        </p>
        <div style={{ fontSize: '0.65rem', color: text, opacity: 0.5 }}>{brandName}</div>
      </div>
    </div>
  )
}

function CarouselCover({ bg, text, accent, density, headingFont, brandName }: CardProps) {
  return (
    <div style={{ background: bg, padding: density.padding, fontFamily: undefined, color: text, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '60%', height: '60%', borderRadius: '50%', background: accent, opacity: 0.15 }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: accent, opacity: 0.1 }} />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 40, height: 2, background: accent, borderRadius: 2, margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: headingFont, fontSize: 'clamp(1.2rem, 4vw, 2rem)', fontWeight: 700, color: text, lineHeight: 1.2, margin: 0 }}>
          5 Lessons From a Year of Building
        </h2>
        <p style={{ marginTop: density.gap, fontSize: '0.75rem', color: text, opacity: 0.6 }}>A thread</p>
        <div style={{ marginTop: 20, fontSize: '0.7rem', fontWeight: 600, color: accent }}>{brandName}</div>
      </div>
    </div>
  )
}
