'use client'

import * as React from 'react'
import type { PreviewCarousel, PreviewDensity, PreviewTextSlide } from '../core/types'
import type { PreviewPalette, MediaChrome } from '../core/spec'
import { PreviewMediaBlock } from './PreviewMediaBlock'

/**
 * Multi-slide carousel. Handles two kinds:
 *  - `image`: swipeable image strip (one slide visible + dots/counter).
 *  - `text-slides`: rendered text slides (Instagram-style carousels generated
 *    before images exist). Visual language borrowed from
 *    components/instagram/CarouselPreview.tsx but generalized + scalable.
 *
 * In `mini` density it collapses to a small 3-up grid (or first slide) with no
 * controls. Mixed image sizes are normalized to a single aspect ratio so the
 * frame doesn't jump between slides.
 */

interface PreviewCarouselBlockProps {
  carousel: PreviewCarousel
  density: PreviewDensity
  palette: PreviewPalette
  chrome: MediaChrome
  /** Aspect ratio to normalize all slides to. */
  aspectRatio: number
}

export function PreviewCarouselBlock({
  carousel,
  density,
  palette,
  chrome,
  aspectRatio,
}: PreviewCarouselBlockProps) {
  const isMini = density === 'mini'
  const images = carousel.images ?? []
  const slides = carousel.slides ?? []
  const count = carousel.kind === 'image' ? images.length : slides.length

  const [index, setIndex] = React.useState(0)
  const clamped = Math.min(index, Math.max(0, count - 1))

  if (count === 0) return null

  // ── Mini: compact grid, no controls ──
  if (isMini) {
    const cells =
      carousel.kind === 'image'
        ? images.slice(0, 3).map((m, i) => (
            <PreviewMediaBlock
              key={i}
              media={{ ...m, aspectRatio: 1 }}
              chrome="rounded"
              borderColor={palette.border}
              placeholderBg={palette.border}
              placeholderText={palette.muted}
              radius={6}
            />
          ))
        : slides.slice(0, 3).map((s) => (
            <div
              key={s.position}
              style={{
                aspectRatio: '1',
                border: `1px solid ${palette.border}`,
                borderRadius: 6,
                padding: 6,
                overflow: 'hidden',
                background: palette.surface,
                color: palette.text,
                fontSize: 9,
                fontWeight: 600,
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <span style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {s.headline}
              </span>
            </div>
          ))
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {cells}
      </div>
    )
  }

  // ── Standard: one slide + counter + dots ──
  const current = (
    <div style={{ position: 'relative', width: '100%' }}>
      {carousel.kind === 'image' ? (
        <PreviewMediaBlock
          media={{ ...images[clamped], aspectRatio }}
          chrome={chrome}
          borderColor={palette.border}
          placeholderBg={palette.border}
          placeholderText={palette.muted}
        />
      ) : (
        <TextSlide slide={slides[clamped]} palette={palette} aspectRatio={aspectRatio} />
      )}

      {/* Slide counter */}
      {count > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 12,
            padding: '2px 9px',
          }}
        >
          {clamped + 1}/{count}
        </div>
      )}

      {/* Prev / next */}
      {count > 1 && (
        <>
          <CarouselArrow
            dir="prev"
            disabled={clamped === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          />
          <CarouselArrow
            dir="next"
            disabled={clamped === count - 1}
            onClick={() => setIndex((i) => Math.min(count - 1, i + 1))}
          />
        </>
      )}
    </div>
  )

  return (
    <div>
      {current}
      {count > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 5,
            paddingTop: 8,
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === clamped ? palette.brand : palette.border,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TextSlide({
  slide,
  palette,
  aspectRatio,
}: {
  slide: PreviewTextSlide | undefined
  palette: PreviewPalette
  aspectRatio: number
}) {
  return (
    <div
      style={{
        aspectRatio: String(aspectRatio),
        width: '100%',
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '8% 9%',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, color: palette.text, fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>
        {slide?.headline}
      </p>
      {slide?.body && (
        <p style={{ margin: 0, color: palette.muted, fontSize: 14, lineHeight: 1.4 }}>
          {slide.body}
        </p>
      )}
    </div>
  )
}

function CarouselArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  if (disabled) return null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous slide' : 'Next slide'}
      style={{
        position: 'absolute',
        top: '50%',
        [dir === 'prev' ? 'left' : 'right']: 10,
        transform: 'translateY(-50%)',
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(255,255,255,0.9)',
        color: '#111',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  )
}
