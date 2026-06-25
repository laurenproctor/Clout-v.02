'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { VerifiedBadge } from '../shared/VerifiedBadge'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { PreviewActionBar } from '../shared/PreviewActionBar'

const PLATFORM = 'threads' as const

export function ThreadsPreview({ data, theme, density }: RendererProps) {
  const spec = getSpec(PLATFORM)
  const p = spec.palette[theme]
  const { author } = data
  const media = data.media?.[0]
  // When a post type expects media but none is attached yet, render a neutral
  // placeholder slot rather than implying an image exists.
  const showMediaSlot = Boolean(media) || data.mediaPending
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <PreviewAvatar
          name={author.name}
          avatarUrl={author.avatarUrl}
          size={isMini ? 28 : spec.avatarSize}
          shape={spec.avatarShape}
          fallbackBg={p.border}
          fallbackText={p.muted}
        />
        {!isMini && <div style={{ width: 1.5, flex: 1, background: p.border, minHeight: 16 }} />}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: p.text }}>
            {author.handle ?? author.name}
          </span>
          <VerifiedBadge author={author} size={13} color={p.brand} />
          <span style={{ fontSize: 14, color: p.muted, marginLeft: 'auto' }}>{data.timestamp ?? 'now'}</span>
        </div>

        <div style={{ marginTop: 4 }}>
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

        {showMediaSlot && (
          <div style={{ marginTop: 10 }}>
            <PreviewMediaBlock
              media={media ?? { url: '', aspectRatio: 1 }}
              pending={!media && data.mediaPending}
              chrome="rounded"
              borderColor={p.border}
              placeholderBg={p.border}
              placeholderText={p.muted}
            />
          </div>
        )}

        {!isMini && (
          <div style={{ marginTop: 12 }}>
            <PreviewActionBar
              actions={['like', 'comment', 'repost', 'send']}
              density={density}
              color={p.text}
              iconSize={20}
            />
          </div>
        )}
      </div>
    </div>
  )
}
