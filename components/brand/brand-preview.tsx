'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TypographySettings, TypographyLevelSettings } from '@/types/typography'
import { injectGoogleFont } from '@/components/brand/font-selector'

export interface BrandSettings {
  brand_name: string | null
  logo_url?: string | null
  logo_url_light?: string | null
  logo_url_dark?: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  accent_color_2: string | null
  dark_bg_color: string | null
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
    text_capitalization?: 'default' | 'uppercase' | 'title' | 'sentence'
  }
}

function resolveCapitalizationStyle(cap: string | undefined): React.CSSProperties['textTransform'] {
  if (cap === 'uppercase') return 'uppercase'
  if (cap === 'title')     return 'capitalize'
  return 'none'
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

function resolveTextTransform(t: string): React.CSSProperties['textTransform'] {
  if (t === 'sentence-case') return 'none'   // sentence case applied via content; no CSS equivalent
  if (t === 'title-case') return 'capitalize' // CSS capitalize = every word's first letter
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

interface BrandPreviewProps {
  settings: BrandSettings
  typographySettings?: TypographySettings
  activeCard?: 'quote' | 'tile' | 'carousel'
  onCardSelect?: (card: 'quote' | 'tile' | 'carousel') => void
  className?: string
}

const TABS = [
  { id: 'quote'    as const, label: 'Quote Card' },
  { id: 'tile'     as const, label: 'Social Tile' },
  { id: 'carousel' as const, label: 'Carousel Cover' },
]

export function BrandPreview({ settings, typographySettings, activeCard = 'quote', onCardSelect, className }: BrandPreviewProps) {
  // Local preview scheme — starts from saved setting, but can be toggled
  const [previewScheme, setPreviewScheme] = useState<'light' | 'dark'>(settings.style_traits.color_scheme)

  // Keep in sync if the saved setting changes
  useEffect(() => {
    setPreviewScheme(settings.style_traits.color_scheme)
  }, [settings.style_traits.color_scheme])

  const isDark = previewScheme === 'dark'
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
    } else if (settings.font_heading) {
      injectGoogleFont(settings.font_heading)
    }
    if (settings.font_body_url) {
      let style = document.getElementById('brand-body-font') as HTMLStyleElement | null
      if (!style) {
        style = document.createElement('style')
        style.id = 'brand-body-font'
        document.head.appendChild(style)
      }
      style.textContent = `@font-face { font-family: "CustomBody"; src: url("${settings.font_body_url}"); }`
    } else if (settings.font_body) {
      injectGoogleFont(settings.font_body)
    }
  }, [settings.font_heading, settings.font_heading_url, settings.font_body, settings.font_body_url])

  const brandName = settings.brand_name || 'Your Brand'
  const currentIndex = TABS.findIndex(t => t.id === activeCard)

  function goPrev() {
    const prev = TABS[(currentIndex - 1 + TABS.length) % TABS.length]
    onCardSelect?.(prev.id)
  }

  function goNext() {
    const next = TABS[(currentIndex + 1) % TABS.length]
    onCardSelect?.(next.id)
  }

  // On dark backgrounds show the light logo variant; on light backgrounds show the dark variant
  const resolvedLogoUrl = isDark
    ? (settings.logo_url_light ?? settings.logo_url ?? null)
    : (settings.logo_url_dark ?? settings.logo_url ?? null)

  const capitalization = resolveCapitalizationStyle(settings.style_traits.text_capitalization)
  const cardProps = { bg, text, accent, radius, density, headingFont, bodyFont, brandName, logoUrl: resolvedLogoUrl, typography: typographySettings, capitalization }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar: navigation + dark/light toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            aria-label="Previous layout"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-xs font-medium text-zinc-600 min-w-[90px] text-center">
            {TABS[currentIndex]?.label ?? 'Quote Card'}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            aria-label="Next layout"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPreviewScheme(s => s === 'dark' ? 'light' : 'dark')}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
          aria-label="Toggle dark/light preview"
          title={previewScheme === 'dark' ? 'Switch to light preview' : 'Switch to dark preview'}
        >
          {previewScheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="aspect-square w-full max-w-sm overflow-hidden shadow-md" style={{ borderRadius: radius }}>
        {activeCard === 'quote'    && <QuoteCard    {...cardProps} />}
        {activeCard === 'tile'     && <SocialTile   {...cardProps} />}
        {activeCard === 'carousel' && <CarouselCover {...cardProps} />}
      </div>
    </div>
  )
}

type CardProps = {
  bg: string; text: string; accent: string; radius: string
  density: { padding: string; gap: string }
  headingFont: string; bodyFont: string; brandName: string
  logoUrl: string | null
  typography?: TypographySettings
  capitalization?: React.CSSProperties['textTransform']
}

function QuoteCard({ bg, text, accent, density, headingFont, bodyFont, brandName, logoUrl, typography, capitalization }: CardProps) {
  return (
    <div style={{ background: bg, padding: density.padding, fontFamily: bodyFont, color: text, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
      <div style={{ width: 24, height: 3, background: accent, borderRadius: 2 }} />
      <blockquote style={{ ...applyTypo(typography?.h2, headingFont, text), fontSize: 'clamp(1rem, 3vw, 1.5rem)', margin: 0, textTransform: capitalization }}>
        &ldquo;The best ideas come from the intersection of discipline and curiosity.&rdquo;
      </blockquote>
      <div style={{ display: 'flex', alignItems: 'center', gap: density.gap }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" style={{ height: 32, maxWidth: 120, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        )}
        {!logoUrl && (
          <div>
            <div style={{ ...applyTypo(typography?.ui, bodyFont, text), fontSize: '0.75rem' }}>{brandName}</div>
            <div style={{ fontFamily: bodyFont, color: text, fontSize: '0.65rem', opacity: 0.6 }}>Thought of the day</div>
          </div>
        )}
        {logoUrl && (
          <div style={{ fontFamily: bodyFont, color: text, fontSize: '0.65rem', opacity: 0.6 }}>Thought of the day</div>
        )}
      </div>
    </div>
  )
}

function SocialTile({ bg, text, accent, density, headingFont, bodyFont, brandName, logoUrl, typography, capitalization }: CardProps) {
  return (
    <div style={{ background: bg, fontFamily: bodyFont, color: text, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...applyTypo(typography?.h1, headingFont, bg), fontSize: '2rem' }}>01</span>
      </div>
      <div style={{ flex: 1, padding: density.padding, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <p style={{ ...applyTypo(typography?.h2, headingFont, text), fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)', margin: 0, textTransform: capitalization }}>
          Building in public changes everything
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: 22, maxWidth: 80, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} />
          )}
          {!logoUrl && (
            <div style={{ ...applyTypo(typography?.ui, bodyFont, text), fontSize: '0.65rem', opacity: 0.5 }}>{brandName}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function CarouselCover({ bg, text, accent, density, headingFont, bodyFont, brandName, logoUrl, typography, capitalization }: CardProps) {
  return (
    <div style={{ background: bg, padding: density.padding, color: text, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '60%', height: '60%', borderRadius: '50%', background: accent, opacity: 0.15 }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: accent, opacity: 0.1 }} />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 40, height: 2, background: accent, borderRadius: 2, margin: '0 auto 16px' }} />
        <h2 style={{ ...applyTypo(typography?.h1, headingFont, text), fontSize: 'clamp(1.2rem, 4vw, 2rem)', margin: 0, textTransform: capitalization }}>
          5 Lessons From a Year of Building
        </h2>
        <p style={{ fontFamily: bodyFont, color: text, marginTop: density.gap, fontSize: '0.75rem', opacity: 0.6 }}>A thread</p>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: 32, maxWidth: 120, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} />
          ) : (
            <div style={{ ...applyTypo(typography?.ui, bodyFont, accent), fontSize: '0.7rem' }}>{brandName}</div>
          )}
        </div>
      </div>
    </div>
  )
}
