'use client'

import { Heart, MessageCircle, Bookmark, Share2, Music2 } from 'lucide-react'
import type { RendererProps } from '../core/types'
import { getSpec } from '../core/spec'
import { PreviewAvatar } from '../shared/PreviewAvatar'
import { PreviewText } from '../shared/PreviewText'

const PLATFORM = 'tiktok' as const

/**
 * TikTok is media-forward: a full 9:16 frame with a right-side action rail and a
 * bottom caption overlay. Always dark (its palette is black in both themes).
 * No video player here — we render the cover image (or a placeholder) plus chrome.
 */
export function TikTokPreview({ data, density }: RendererProps) {
  const spec = getSpec(PLATFORM)
  const { author } = data
  const media = data.media?.[0]
  const isMini = density === 'mini'

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9 / 16',
        background: '#000',
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: spec.fontFamily,
        color: '#fff',
      }}
    >
      {/* Cover image / placeholder */}
      {media ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt={media.alt ?? ''}
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            background: 'linear-gradient(160deg,#1a1a1a,#000)',
          }}
        >
          Add a video
        </div>
      )}

      {/* Bottom gradient for caption legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 45%)',
          pointerEvents: 'none',
        }}
      />

      {/* Right action rail */}
      {!isMini && (
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <PreviewAvatar
            name={author.name}
            avatarUrl={author.avatarUrl}
            size={40}
            shape="circle"
            fallbackBg="#333"
            fallbackText="#fff"
          />
          <RailIcon icon={<Heart size={26} fill="#fff" stroke="none" />} />
          <RailIcon icon={<MessageCircle size={26} fill="#fff" stroke="none" />} />
          <RailIcon icon={<Bookmark size={26} fill="#fff" stroke="none" />} />
          <RailIcon icon={<Share2 size={24} />} />
        </div>
      )}

      {/* Bottom caption */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: isMini ? 12 : 60,
          bottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          @{author.handle ?? author.name}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.35 }}>
          <PreviewText
            body={data.body}
            hashtags={data.hashtags}
            seeMoreAfterChars={spec.seeMoreAfterChars}
            density={density}
            color="#fff"
            mutedColor="rgba(255,255,255,0.8)"
            accentColor="#fff"
            fontSize={13}
            lineHeight={1.35}
            seeMoreLabel="more"
          />
        </div>
        {!isMini && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
            <Music2 size={13} aria-hidden="true" />
            <span>original sound — {author.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function RailIcon({ icon }: { icon: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>{icon}</span>
}
