'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { SubstackGlyph } from '../brand-icons'

const PLATFORM = 'substack' as const

/**
 * Substack newsletter/post card: optional wide header image, serif title,
 * author byline, body. No social reaction row by default.
 */
export function SubstackPreview({ data, theme, density }: RendererProps) {
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

      <div style={{ padding: isMini ? 12 : '18px 22px' }}>
        {/* Publication mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <SubstackGlyph size={13} color={p.brand} />
          <span style={{ fontSize: 12, fontWeight: 600, color: p.muted, fontFamily: '-apple-system, sans-serif' }}>
            Newsletter
          </span>
        </div>

        {data.title && (
          <h2 style={{ margin: 0, fontSize: isMini ? 16 : 24, fontWeight: 700, lineHeight: 1.2, color: p.text }}>
            {data.title}
          </h2>
        )}

        {/* Byline */}
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
