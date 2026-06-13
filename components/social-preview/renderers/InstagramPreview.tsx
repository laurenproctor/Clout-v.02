'use client'

import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { VerifiedBadge } from '../shared/VerifiedBadge'
import { PreviewText } from '../shared/PreviewText'
import { PreviewMediaBlock } from '../shared/PreviewMediaBlock'
import { PreviewCarouselBlock } from '../shared/PreviewCarouselBlock'
import { PreviewActionBar } from '../shared/PreviewActionBar'

const PLATFORM = 'instagram' as const

export function InstagramPreview({ data, theme, density }: RendererProps) {
  const spec = getSpec(PLATFORM)
  const p = spec.palette[theme]
  const { author } = data
  const media = data.media?.[0]
  const isMini = density === 'mini'
  const ratio = media?.aspectRatio ?? 1

  return (
    <div
      style={{
        width: '100%',
        background: p.surface,
        border: `1px solid ${p.border}`,
        borderRadius: isMini ? 6 : 4,
        fontFamily: spec.fontFamily,
        color: p.text,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMini ? 8 : '10px 12px' }}>
        <PreviewAvatar
          name={author.name}
          avatarUrl={author.avatarUrl}
          size={isMini ? 24 : spec.avatarSize}
          shape={spec.avatarShape}
          fallbackBg={p.border}
          fallbackText={p.muted}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: p.text }}>
            {author.handle ?? author.name}
          </span>
          <VerifiedBadge author={author} size={13} color={p.brand} />
        </div>
        {!isMini && <span style={{ marginLeft: 'auto', color: p.text, fontWeight: 700 }}>⋯</span>}
      </div>

      {/* Media — Instagram is image-first */}
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
      ) : (
        // No image: IG posts require media — show a neutral square placeholder.
        <div
          style={{
            width: '100%',
            aspectRatio: String(ratio),
            background: p.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: p.muted,
            fontSize: 12,
          }}
        >
          Add an image
        </div>
      )}

      {!isMini && (
        <div style={{ padding: '8px 12px 12px' }}>
          <PreviewActionBar
            actions={['like', 'comment', 'send']}
            density={density}
            color={p.text}
            iconSize={22}
          />
          {/* Caption: handle + body */}
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.4 }}>
            <PreviewText
              body={
                author.handle
                  ? `${author.handle}  ${data.body}`
                  : data.body
              }
              hashtags={data.hashtags}
              seeMoreAfterChars={spec.seeMoreAfterChars}
              density={density}
              color={p.text}
              mutedColor={p.muted}
              accentColor={p.brand}
              fontSize={13}
              lineHeight={1.4}
              seeMoreLabel="more"
            />
          </div>
        </div>
      )}
    </div>
  )
}
