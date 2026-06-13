'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { VerifiedBadge } from '../shared/VerifiedBadge'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { PreviewCarouselBlock } from '../shared/PreviewCarouselBlock'
import { PreviewActionBar } from '../shared/PreviewActionBar'
import { LinkedInGlyph } from '../brand-icons'

const PLATFORM = 'linkedin' as const

export function LinkedInPreview({ data, theme, density }: RendererProps) {
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
      <div style={{ padding: isMini ? 10 : '12px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <PreviewAvatar
            name={author.name}
            avatarUrl={author.avatarUrl}
            size={isMini ? 32 : spec.avatarSize}
            shape={spec.avatarShape}
            fallbackBg={p.border}
            fallbackText={p.muted}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: p.text }}>{author.name}</span>
              <VerifiedBadge author={author} size={14} color={p.brand} />
            </div>
            {author.subtitle && (
              <div style={{ fontSize: 12, color: p.muted, lineHeight: 1.3 }}>{author.subtitle}</div>
            )}
            <div style={{ fontSize: 12, color: p.muted }}>{data.timestamp ?? 'Now'} · 🌐</div>
          </div>
          {!isMini && (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: p.brand, fontWeight: 600, fontSize: 14 }}>
              <LinkedInGlyph size={18} color={p.brand} />
              + Follow
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ marginTop: 8 }}>
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
            seeMoreLabel="…see more"
          />
        </div>
      </div>

      {/* Media (full-bleed for LinkedIn) */}
      {data.carousel ? (
        <PreviewCarouselBlock
          carousel={data.carousel}
          density={density}
          palette={p}
          chrome="flat"
          aspectRatio={data.carousel.images?.[0]?.aspectRatio ?? 1}
        />
      ) : media ? (
        <PreviewMediaBlock
          media={media}
          chrome="flat"
          borderColor={p.border}
          placeholderBg={p.border}
          placeholderText={p.muted}
        />
      ) : null}

      {/* Action bar */}
      {!isMini && (
        <div style={{ padding: '4px 16px 10px' }}>
          <PreviewActionBar
            actions={['thumbsup', 'comment', 'repost', 'send']}
            density={density}
            color={p.muted}
            withLabels
            spread
            iconSize={18}
            borderTop={`1px solid ${p.border}`}
          />
        </div>
      )}
    </div>
  )
}
