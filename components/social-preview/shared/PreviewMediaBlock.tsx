'use client'

import * as React from 'react'
import type { PreviewMedia } from '../core/types'
import type { MediaChrome } from '../core/spec'

/**
 * Renders a single media item at a fixed aspect ratio with object-cover.
 * Handles loading and broken-image states with a neutral placeholder — a
 * missing/broken asset must never break the surrounding post.
 */

interface PreviewMediaBlockProps {
  media: PreviewMedia
  chrome: MediaChrome
  /** Border color used for card/rounded chrome. */
  borderColor: string
  /** Neutral placeholder background. */
  placeholderBg: string
  placeholderText: string
  radius?: number
  /** Render a loading skeleton (no image) — used while a visual is generating. */
  pending?: boolean
  /**
   * Optional status text shown over the pending skeleton (e.g. "Creating image…").
   * When provided, the slot reads as an active-generation state with a spinner;
   * when omitted, it stays a plain neutral placeholder slot.
   */
  pendingLabel?: string
}

export function PreviewMediaBlock({
  media,
  chrome,
  borderColor,
  placeholderBg,
  placeholderText,
  radius = 12,
  pending = false,
  pendingLabel,
}: PreviewMediaBlockProps) {
  const [failed, setFailed] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  const borderRadius = chrome === 'flat' ? 0 : radius
  const border = chrome === 'rounded' || chrome === 'card' ? `1px solid ${borderColor}` : 'none'

  // Pending: occupy the exact media slot with a shimmer so the image visibly
  // "streams in" once generation completes. No `url` is read in this path.
  // With a `pendingLabel`, overlay a spinner + status so the user knows an image
  // is actively being created; without one, it's a plain neutral slot.
  if (pending) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: String(media.aspectRatio),
          background: placeholderBg,
          borderRadius,
          border,
          overflow: 'hidden',
        }}
      >
        <div aria-hidden="true" className="animate-pulse" style={{ position: 'absolute', inset: 0, background: placeholderBg }} />
        {pendingLabel && (
          <div
            role="status"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span
              aria-hidden="true"
              className="animate-spin"
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${placeholderText}`,
                borderTopColor: 'transparent',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 500, color: placeholderText }}>{pendingLabel}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: String(media.aspectRatio),
        background: placeholderBg,
        borderRadius,
        border,
        overflow: 'hidden',
      }}
    >
      {!failed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt={media.alt ?? ''}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 200ms ease',
            }}
          />
          {!loaded && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: placeholderBg,
              }}
            />
          )}
        </>
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: placeholderText,
            fontSize: 12,
          }}
        >
          Image unavailable
        </div>
      )}
    </div>
  )
}
