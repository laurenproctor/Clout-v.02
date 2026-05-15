import type { CanonicalArticle } from '../canonical/types'
import type { PublishOptions } from '../types'

// ─── EditorialMetadata ────────────────────────────────────────────────────────
// What the content IS — for display and rendering.
// SEO and generation intelligence are separate concerns (see below).

export interface EditorialMetadata {
  title:    string
  subtitle?: string   // high-value display field — Medium renders this prominently
  dek?:     string    // editorial subheadline; sometimes identical to subtitle
  slug?:    string
}

// ─── SEOConfig ────────────────────────────────────────────────────────────────
// Canonicalization and discoverability concerns — not editorial display.
// canonicalUrl is critical for cross-published content to avoid SEO duplicate penalties.

export interface SEOConfig {
  canonicalUrl?:     string
  metaTitle?:        string
  metaDescription?:  string
  noIndex?:          boolean
}

// ─── NarrativeIntent ─────────────────────────────────────────────────────────
// Generation intelligence — not metadata, not SEO.
// audienceIntent and narrativeArc inform how content is generated and positioned.
// tags live here because they are a generation signal, not just display metadata.

export interface NarrativeIntent {
  audienceIntent?: string    // who this is for and what they should take away
  narrativeArc?:   string    // the throughline — what the piece builds toward
  tags?:           string[]  // discovery taxonomy; generation signal, not just metadata
}

// ─── EditorialProfile ─────────────────────────────────────────────────────────
// Assembled from CanonicalArticle + PublishOptions before any provider transform.
// Providers receive EditorialProfile, not raw article fields directly.

export interface EditorialProfile {
  editorial: EditorialMetadata
  seo:       SEOConfig
  narrative: NarrativeIntent
}

// ─── extractEditorialProfile ──────────────────────────────────────────────────
// TRANSITIONAL BRIDGE — V1 only.
// Maps the current flat CanonicalArticle to the three-layer structure.
// This is intentionally temporary. CanonicalArticle should eventually absorb
// editorial/seo/narrative directly. Do not let this bridge harden into permanent architecture.

export function extractEditorialProfile(
  article: CanonicalArticle,
  opts: PublishOptions,
): EditorialProfile {
  return {
    editorial: {
      title:    opts.overrideTitle ?? article.title,
      subtitle: article.dek,
      dek:      article.dek,
      slug:     opts.overrideSlug ?? article.slug,
    },
    seo: {
      canonicalUrl:    article.seo?.canonicalUrl,
      metaTitle:       article.seo?.metaTitle ?? opts.overrideTitle,
      metaDescription: article.seo?.metaDescription ?? opts.overrideExcerpt,
    },
    narrative: {
      tags: opts.tags ?? article.tags,
    },
  }
}
