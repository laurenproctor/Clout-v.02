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
}

export function PreviewMediaBlock({
  media,
  chrome,
  borderColor,
  placeholderBg,
  placeholderText,
  radius = 12,
}: PreviewMediaBlockProps) {
  const [failed, setFailed] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  const borderRadius = chrome === 'flat' ? 0 : radius
  const border = chrome === 'rounded' || chrome === 'card' ? `1px solid ${borderColor}` : 'none'

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
