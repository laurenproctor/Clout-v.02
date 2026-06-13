'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { GoogleBusinessGlyph } from '../brand-icons'

const PLATFORM = 'google_business' as const

/**
 * Google Business Profile "update" card. Business-update style: logo + name +
 * "Google post", media on top, short body with "Read more", and a CTA button
 * row — no social reaction chrome.
 */
export function GoogleBusinessPreview({ data, theme, density }: RendererProps) {
  const spec = getSpec(PLATFORM)
  const p = spec.palette[theme]
  const { author } = data
  const media = data.media?.[0]
  const isMini = density === 'mini'

  return (
    <div
      style={{
        width: '100%',
        background: p.surface,
        border: `1px solid ${p.border}`,
        borderRadius: 12,
        fontFamily: spec.fontFamily,
        color: p.text,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(60,64,67,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMini ? 10 : '12px 14px' }}>
        <PreviewAvatar
          name={author.name}
          avatarUrl={author.avatarUrl}
          size={isMini ? 28 : spec.avatarSize}
          shape={spec.avatarShape}
          fallbackBg={p.border}
          fallbackText={p.muted}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: p.text }}>{author.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: p.muted }}>
            <GoogleBusinessGlyph size={12} color={p.muted} />
            <span>Google post · {data.timestamp ?? 'Just now'}</span>
          </div>
        </div>
      </div>

      {/* Media */}
      {media && (
        <PreviewMediaBlock
          media={media}
          chrome="flat"
          borderColor={p.border}
          placeholderBg={p.border}
          placeholderText={p.muted}
        />
      )}

      {/* Body + CTA */}
      <div style={{ padding: isMini ? 10 : '12px 14px' }}>
        <PreviewText
          body={data.body}
          hashtags={data.hashtags}
          seeMoreAfterChars={spec.seeMoreAfterChars}
          density={density}
          color={p.text}
          mutedColor={p.muted}
          accentColor={p.brand}
          fontSize={14}
          lineHeight={1.45}
          seeMoreLabel="Read more"
        />
        {!isMini && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: p.brand }}>Learn more</span>
          </div>
        )}
      </div>
    </div>
  )
}
