'use client'

import type { PreviewAuthor } from '../core/types'

/**
 * Verified checkmark. Rendered ONLY when `author.verified === true` — i.e. from
 * trusted account metadata. We never infer verification from platform type,
 * label, or the presence of a profile image. False verification is a trust
 * problem, so the default is to show nothing.
 */

interface VerifiedBadgeProps {
  author: PreviewAuthor
  size?: number
  /** Badge fill color (platform brand blue by default). */
  color?: string
}

export function VerifiedBadge({ author, size = 15, color = '#1d9bf0' }: VerifiedBadgeProps) {
  if (author.verified !== true) return null

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="Verified account"
      role="img"
      style={{ flexShrink: 0 }}
    >
      <path
        fill={color}
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.582.875 2.95 2.147 3.6-.154.435-.237.905-.237 1.4 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.494-.083-.964-.237-1.4 1.272-.65 2.147-2.018 2.147-3.6z"
      />
      <path
        fill="#fff"
        d="M16.53 9.78l-5.06 5.06-2.47-2.47-1.06 1.06 3.53 3.53 6.12-6.12z"
      />
    </svg>
  )
}
