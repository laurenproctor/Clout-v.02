/**
 * Shared social-preview rendering primitive — core types.
 *
 * These types are the contract every renderer consumes. Renderers receive a
 * fully-resolved `PreviewData` — never database rows. Adapters
 * (`adapters/*`) map source data (Studio editor state, an Output record) into
 * this shape. Keeping renderers DB-agnostic is what lets the same primitive
 * power Studio, Review, Calendar, Campaigns, and future surfaces.
 */

/** Visual scale of the preview. */
export type PreviewMode = 'full' | 'compact' | 'mini'

/** Content behavior — distinct from visual scale. `mini` strips/clamps chrome. */
export type PreviewDensity = 'standard' | 'mini'

/** Each platform card uses its own fixed palette, NOT Clout app tokens. */
export type PreviewTheme = 'light' | 'dark'

/**
 * Platforms with a dedicated realistic renderer. This is the preview-domain
 * union and is intentionally narrower/normalized vs. `ChannelPlatform`
 * (e.g. twitter→x, newsletter→substack, medium/blog/wordpress→article).
 * The adapter layer maps `ChannelPlatform` → `PreviewPlatform`.
 */
export type PreviewPlatform =
  | 'linkedin'
  | 'x'
  | 'threads'
  | 'instagram'
  | 'facebook'
  | 'bluesky'
  | 'mastodon'
  | 'google_business'
  | 'tiktok'
  | 'substack'
  | 'article'
  | 'fallback'

/**
 * Verification source. We only ever render a badge when this is set from
 * trusted account metadata — never inferred from platform/label/avatar.
 */
export type VerifiedType = 'platform' | 'business' | 'paid' | 'unknown'

export interface PreviewAuthor {
  name: string
  /** Real handle from connected-account metadata. Omitted if unknown — never fabricated. */
  handle?: string
  avatarUrl?: string
  verified?: boolean
  verifiedType?: VerifiedType
  /** Secondary line, e.g. LinkedIn headline or "1st · now". */
  subtitle?: string
}

export interface PreviewMedia {
  url: string
  /** Numeric width/height ratio (e.g. 1, 4/5, 16/9). Resolved against platform spec when unknown. */
  aspectRatio: number
  alt?: string
}

export interface PreviewTextSlide {
  position: number
  role?: string
  headline?: string
  body?: string
}

export interface PreviewCarousel {
  kind: 'image' | 'text-slides'
  images?: PreviewMedia[]
  slides?: PreviewTextSlide[]
}

/** Reserved now so URL preview cards can be added later without changing the contract. */
export interface PreviewLink {
  url: string
  title?: string
  description?: string
  imageUrl?: string
  domain?: string
}

export interface PreviewData {
  platform: PreviewPlatform
  author: PreviewAuthor
  /** Subject (newsletter) / headline (article). */
  title?: string
  body: string
  hashtags?: string[]
  media?: PreviewMedia[]
  carousel?: PreviewCarousel
  /** Display timestamp; defaults to "now" when absent. */
  timestamp?: string
  link?: PreviewLink
}

/** Props shared by every platform renderer. */
export interface RendererProps {
  data: PreviewData
  theme: PreviewTheme
  density: PreviewDensity
}
