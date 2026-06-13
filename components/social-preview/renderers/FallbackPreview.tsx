'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { getPlatformLimit } from '../core/platformConstraints'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'

/**
 * Neutral, brand-agnostic card for platforms without a dedicated renderer yet.
 * Keeps the preview useful (author + text + media) without impersonating any
 * specific platform.
 */
export function FallbackPreview({ data, theme, density }: RendererProps) {
  const spec = getSpec(data.platform)
  const p = spec.palette[theme]
  const { author } = data
  const media = data.media?.[0]
  const isMini = density === 'mini'
  const label = getPlatformLimit(data.platform).label

  return (
    <div
      style={{
        width: '100%',
        background: p.surface,
        border: `1px solid ${p.border}`,
        borderRadius: 10,
        padding: isMini ? 10 : 14,
        fontFamily: spec.fontFamily,
        color: p.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          {author.handle && <div style={{ fontSize: 12, color: p.muted }}>@{author.handle}</div>}
        </div>
        {!isMini && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: p.muted,
              border: `1px solid ${p.border}`,
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {label}
          </span>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <PreviewText
          body={data.body}
          hashtags={data.hashtags}
          seeMoreAfterChars={spec.seeMoreAfterChars}
          density={density}
          color={p.text}
          mutedColor={p.muted}
          accentColor={p.brand}
          fontSize={14}
        />
      </div>

      {media && (
        <div style={{ marginTop: 10 }}>
          <PreviewMediaBlock
            media={media}
            chrome="rounded"
            borderColor={p.border}
            placeholderBg={p.border}
            placeholderText={p.muted}
          />
        </div>
      )}
    </div>
  )
}
