'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { VerifiedBadge } from '../shared/VerifiedBadge'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { PreviewActionBar } from '../shared/PreviewActionBar'

const PLATFORM = 'mastodon' as const

export function MastodonPreview({ data, theme, density }: RendererProps) {
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
        padding: isMini ? 10 : 14,
        fontFamily: spec.fontFamily,
        color: p.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <span style={{ fontSize: 14, fontWeight: 700, color: p.text }}>{author.name}</span>
            <VerifiedBadge author={author} size={13} color={p.brand} />
          </div>
          {author.handle && (
            <div style={{ fontSize: 13, color: p.muted }}>@{author.handle}</div>
          )}
        </div>
        <span style={{ fontSize: 13, color: p.muted }}>{data.timestamp ?? 'now'}</span>
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
          fontSize={15}
          lineHeight={1.5}
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
            radius={8}
          />
        </div>
      )}

      {!isMini && (
        <div style={{ marginTop: 12 }}>
          <PreviewActionBar
            actions={['comment', 'repost', 'like', 'share']}
            density={density}
            color={p.muted}
            spread
            iconSize={18}
          />
        </div>
      )}
    </div>
  )
}
