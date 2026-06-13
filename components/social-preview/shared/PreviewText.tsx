'use client'

import * as React from 'react'
import type { PreviewDensity } from '../core/types'

/**
 * Post body text. Preserves line breaks, renders hashtags in the brand accent,
 * and applies a platform-style "see more" truncation. Never mutates the
 * original text — truncation is presentational and toggleable.
 *
 * In `mini` density the text is hard-clamped to a couple of lines with no
 * "see more" affordance (a thumbnail shouldn't be interactive).
 */

interface PreviewTextProps {
  body: string
  hashtags?: string[]
  /** Chars before "see more"; null disables truncation. */
  seeMoreAfterChars: number | null
  density: PreviewDensity
  color: string
  mutedColor: string
  accentColor: string
  emptyText?: string
  fontSize?: number
  lineHeight?: number
  /** Label for the expand affordance, e.g. "…see more" / "… more". */
  seeMoreLabel?: string
}

/** Render body with inline hashtags styled in the accent color. */
function renderWithHashtags(text: string, accentColor: string, trailing?: string[]) {
  // Style inline #tags already present in the text.
  const parts = text.split(/(#[\p{L}0-9_]+)/gu)
  const nodes: React.ReactNode[] = parts.map((part, i) =>
    /^#[\p{L}0-9_]+$/u.test(part)
      ? <span key={`i${i}`} style={{ color: accentColor }}>{part}</span>
      : <React.Fragment key={`t${i}`}>{part}</React.Fragment>,
  )

  // Append trailing hashtags (from the structured hashtags array) that aren't
  // already in the body.
  if (trailing && trailing.length) {
    const present = new Set(
      (text.match(/#[\p{L}0-9_]+/gu) ?? []).map((h) => h.toLowerCase()),
    )
    const extra = trailing
      .map((h) => (h.startsWith('#') ? h : `#${h}`))
      .filter((h) => !present.has(h.toLowerCase()))
    if (extra.length) {
      nodes.push(
        <React.Fragment key="tags-sep">{'\n\n'}</React.Fragment>,
        <span key="tags" style={{ color: accentColor }}>{extra.join(' ')}</span>,
      )
    }
  }
  return nodes
}

export function PreviewText({
  body,
  hashtags,
  seeMoreAfterChars,
  density,
  color,
  mutedColor,
  accentColor,
  emptyText = 'No post text yet',
  fontSize = 14,
  lineHeight = 1.45,
  seeMoreLabel = '…more',
}: PreviewTextProps) {
  const [expanded, setExpanded] = React.useState(false)
  const isMini = density === 'mini'

  if (!body.trim() && !(hashtags && hashtags.length)) {
    return (
      <p style={{ margin: 0, color: mutedColor, fontSize, fontStyle: 'italic' }}>
        {emptyText}
      </p>
    )
  }

  // Mini: hard clamp to 2 lines, no interaction.
  if (isMini) {
    return (
      <p
        style={{
          margin: 0,
          color,
          fontSize,
          lineHeight,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {body || (hashtags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
      </p>
    )
  }

  const shouldTruncate =
    seeMoreAfterChars != null && !expanded && body.length > seeMoreAfterChars
  const shown = shouldTruncate ? body.slice(0, seeMoreAfterChars).trimEnd() : body

  return (
    <p
      style={{
        margin: 0,
        color,
        fontSize,
        lineHeight,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {renderWithHashtags(shown, accentColor, shouldTruncate ? undefined : hashtags)}
      {shouldTruncate && (
        <>
          {'… '}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              color: mutedColor,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            {seeMoreLabel}
          </button>
        </>
      )}
    </p>
  )
}
