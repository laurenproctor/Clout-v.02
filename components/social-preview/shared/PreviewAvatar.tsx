'use client'

import * as React from 'react'
import type { AvatarShape } from '../core/spec'

/**
 * Avatar with graceful fallback. Renders the real image when present and
 * loadable; otherwise initials on a neutral brand-tinted background. Never
 * shows a broken-image icon.
 */

interface PreviewAvatarProps {
  name: string
  avatarUrl?: string
  size: number
  shape: AvatarShape
  /** Background + text color for the initials fallback. */
  fallbackBg: string
  fallbackText: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function PreviewAvatar({
  name,
  avatarUrl,
  size,
  shape,
  fallbackBg,
  fallbackText,
}: PreviewAvatarProps) {
  const [failed, setFailed] = React.useState(false)
  const radius = shape === 'circle' ? '50%' : Math.round(size * 0.22)
  const showImage = avatarUrl && !failed

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        overflow: 'hidden',
        background: fallbackBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            color: fallbackText,
            fontSize: Math.round(size * 0.4),
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  )
}
