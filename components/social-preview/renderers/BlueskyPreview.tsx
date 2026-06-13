'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { VerifiedBadge } from '../shared/VerifiedBadge'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { PreviewActionBar } from '../shared/PreviewActionBar'

const PLATFORM = 'bluesky' as const

export function BlueskyPreview({ data, theme, density }: RendererProps) {
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
        padding: isMini ? 10 : 14,
        fontFamily: spec.fontFamily,
        color: p.text,
        display: 'flex',
        gap: 10,
      }}
    >
      <PreviewAvatar
        name={author.name}
        avatarUrl={author.avatarUrl}
        size={isMini ? 30 : spec.avatarSize}
        shape={spec.avatarShape}
        fallbackBg={p.border}
        fallbackText={p.muted}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: p.text }}>{author.name}</span>
          <VerifiedBadge author={author} size={13} color={p.brand} />
          {author.handle && <span style={{ fontSize: 14, color: p.muted }}>@{author.handle}</span>}
          <span style={{ fontSize: 14, color: p.muted }}>· {data.timestamp ?? 'now'}</span>
        </div>

        <div style={{ marginTop: 2 }}>
          <PreviewText
            body={data.body}
            hashtags={data.hashtags}
            seeMoreAfterChars={spec.seeMoreAfterChars}
            density={density}
            color={p.text}
            mutedColor={p.muted}
            accentColor={p.brand}
            fontSize={15}
            lineHeight={1.4}
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
              radius={10}
            />
          </div>
        )}

        {!isMini && (
          <div style={{ marginTop: 10 }}>
            <PreviewActionBar
              actions={['comment', 'repost', 'like']}
              density={density}
              color={p.muted}
              spread
              iconSize={17}
            />
          </div>
        )}
      </div>
    </div>
  )
}
