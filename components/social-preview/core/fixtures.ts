/**
 * Preview fixtures — representative `PreviewData` for visual testing without a
 * live Studio draft. Covers the happy path plus the edge cases every renderer
 * must survive (missing avatar, broken media, long body, empty body, carousel).
 *
 * Used by the dev gallery (app/dev/social-previews) and ad-hoc local harnesses.
 */

import type { PreviewData } from './types'

// Stable demo avatar (public sample). Swap freely — fixtures are dev-only.
const AVATAR = 'https://i.pravatar.cc/300?img=12'
const PHOTO = 'https://picsum.photos/seed/clout-preview/1200/1200'
const PHOTO_WIDE = 'https://picsum.photos/seed/clout-wide/1280/720'

const LONG_BODY = `We shipped a new way to see your posts before they go live.

The preview is not decoration — it's the moment you decide whether an idea is ready to represent you in public. So we made it realistic: real avatars, real handles, correct image ratios, and the actual post formats including carousels.

Three principles guided the build:
1. One shared rendering primitive, not per-surface copies.
2. High-fidelity but honest — representative, never claiming to be the official platform.
3. Degrade gracefully when media or metadata is missing.

Curious what you think.`

export const FIXTURES: Record<string, PreviewData> = {
  'linkedin-text': {
    platform: 'linkedin',
    author: { name: 'Lauren Proctor', handle: 'laurenproctor', avatarUrl: AVATAR, subtitle: 'Founder · Clout' },
    body: LONG_BODY,
    hashtags: ['publishing', 'producttrust'],
  },
  'linkedin-image': {
    platform: 'linkedin',
    author: { name: 'Lauren Proctor', handle: 'laurenproctor', avatarUrl: AVATAR, verified: true, subtitle: 'Founder · Clout' },
    body: 'New realistic previews are live. Here is how a LinkedIn post looks before you publish.',
    media: [{ url: PHOTO, aspectRatio: 1 }],
    hashtags: ['design'],
  },
  'x-short': {
    platform: 'x',
    author: { name: 'Lauren Proctor', handle: 'laurenproctor', avatarUrl: AVATAR, verified: true },
    body: 'shipped: realistic post previews. you can finally see exactly what goes live before it goes live.',
  },
  'x-image': {
    platform: 'x',
    author: { name: 'Lauren Proctor', handle: 'laurenproctor', avatarUrl: AVATAR },
    body: 'a preview is a trust layer, not decoration.',
    media: [{ url: PHOTO_WIDE, aspectRatio: 16 / 9 }],
  },
  'instagram-image': {
    platform: 'instagram',
    author: { name: 'lauren.builds', handle: 'lauren.builds', avatarUrl: AVATAR, verified: true },
    body: 'See it before you ship it ✨ #buildinpublic #design',
    media: [{ url: PHOTO, aspectRatio: 1 }],
  },
  'instagram-carousel': {
    platform: 'instagram',
    author: { name: 'lauren.builds', handle: 'lauren.builds', avatarUrl: AVATAR },
    body: 'A 5-slide breakdown of how realistic previews work →',
    carousel: {
      kind: 'text-slides',
      slides: [
        { position: 1, role: 'hook', headline: 'Stop guessing what your post looks like', body: 'Swipe →' },
        { position: 2, role: 'insight', headline: 'A preview is a trust layer', body: 'Not decoration.' },
        { position: 3, role: 'tension', headline: 'Most tools show plain text', body: 'That is not what publishes.' },
        { position: 4, role: 'discovery', headline: 'We render the real format', body: 'Avatars, ratios, carousels.' },
        { position: 5, role: 'cta', headline: 'See it before you ship it', body: 'Now in Clout.' },
      ],
    },
  },
  'threads-text': {
    platform: 'threads',
    author: { name: 'lauren.builds', handle: 'lauren.builds', avatarUrl: AVATAR },
    body: 'realistic previews are the kind of feature nobody asks for and everybody wants once it exists.',
  },
  'fallback': {
    platform: 'fallback',
    author: { name: 'Clout', handle: 'clout' },
    body: 'Preview for this platform is coming soon.',
  },

  // ── Edge cases ──
  'missing-avatar': {
    platform: 'linkedin',
    author: { name: 'Jordan Lee', subtitle: 'No avatar on file' },
    body: 'This author has no profile image — the preview should fall back to initials.',
  },
  'broken-media': {
    platform: 'instagram',
    author: { name: 'lauren.builds', handle: 'lauren.builds', avatarUrl: AVATAR },
    body: 'The image URL below is broken; render a neutral placeholder, not a broken-image icon.',
    media: [{ url: 'https://example.invalid/does-not-exist.jpg', aspectRatio: 1 }],
  },
  'empty-body': {
    platform: 'x',
    author: { name: 'Lauren Proctor', handle: 'laurenproctor', avatarUrl: AVATAR },
    body: '',
  },
  'long-body': {
    platform: 'facebook',
    author: { name: 'Lauren Proctor', handle: 'laurenproctor', avatarUrl: AVATAR },
    body: LONG_BODY + '\n\n' + LONG_BODY,
  },
}

export const FIXTURE_KEYS = Object.keys(FIXTURES)
