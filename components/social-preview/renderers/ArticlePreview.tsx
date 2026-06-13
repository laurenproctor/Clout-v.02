'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { getPlatformLimit } from '../core/platformConstraints'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'

const PLATFORM = 'article' as const

/**
 * Generic editorial article card — the renderer for Medium / blog / WordPress
 * outputs. Wide hero image, serif title, byline, body. No platform-specific
 * social chrome.
 */
export function ArticlePreview({ data, theme, density }: RendererProps) {
  const spec = getSpec(PLATFORM)
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
        borderRadius: 8,
        fontFamily: spec.fontFamily,
        color: p.text,
        overflow: 'hidden',
      }}
    >
      {media && (
        <PreviewMediaBlock
          media={{ ...media, aspectRatio: media.aspectRatio || spec.defaultRatio }}
          chrome="flat"
          borderColor={p.border}
          placeholderBg={p.border}
          placeholderText={p.muted}
        />
      )}

      <div style={{ padding: isMini ? 12 : '20px 24px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: p.muted,
            marginBottom: 8,
            fontFamily: '-apple-system, sans-serif',
          }}
        >
          {label}
        </div>

        {data.title && (
          <h2 style={{ margin: 0, fontSize: isMini ? 16 : 26, fontWeight: 700, lineHeight: 1.18, color: p.text }}>
            {data.title}
          </h2>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
          <PreviewAvatar
            name={author.name}
            avatarUrl={author.avatarUrl}
            size={isMini ? 24 : spec.avatarSize}
            shape={spec.avatarShape}
            fallbackBg={p.border}
            fallbackText={p.muted}
          />
          <span style={{ fontSize: 13, color: p.muted, fontFamily: '-apple-system, sans-serif' }}>
            {author.name} · {data.timestamp ?? 'Just now'}
          </span>
        </div>

        <PreviewText
          body={data.body}
          hashtags={data.hashtags}
          seeMoreAfterChars={spec.seeMoreAfterChars}
          density={density}
          color={p.text}
          mutedColor={p.muted}
          accentColor={p.brand}
          fontSize={isMini ? 13 : 17}
          lineHeight={1.6}
        />
      </div>
    </div>
  )
}
