// lib/pinterest/content.ts
// Resolves Pinterest-native TEXT/SEO fields (title, description, alt text, keywords,
// visual text, SEO intent, board section) for a Pin, preferring platform-specific
// content under content.platforms.pinterest before falling back to generic output
// fields. Validation and publish both go through this resolver so they always agree.
//
// outputs.content is JSONB — every nested value is UNTRUSTED at runtime regardless of
// its TypeScript type. Nothing here ever calls .trim() directly on a JSONB value; every
// field is routed through a cleaner that guards typeof first.
//
// Destination URL and board resolution are NOT handled here — they belong to
// resolvePinterestDestinationUrl (./destination) and resolveBoardForOutput (./boards).
import type { Output, PinterestSeoIntent } from '@/types/domain'

const TITLE_MAX = 100
const DESCRIPTION_MAX = 500
const ALT_TEXT_MAX = 500
const KEYWORD_MAX_CHARS = 80
const KEYWORDS_MAX_COUNT = 12

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function cleanPinterestTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = collapse(value)
  return cleaned ? cleaned.slice(0, TITLE_MAX) : null
}

export function cleanPinterestDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = collapse(value)
  return cleaned ? cleaned.slice(0, DESCRIPTION_MAX) : null
}

export function cleanPinterestAltText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = collapse(value)
  return cleaned ? cleaned.slice(0, ALT_TEXT_MAX) : null
}

/** Trim + collapse, drop empties, cap each at 80 chars, dedupe case-insensitively, cap list at 12. */
export function cleanPinterestKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const cleaned = collapse(item).slice(0, KEYWORD_MAX_CHARS)
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
    if (out.length >= KEYWORDS_MAX_COUNT) break
  }
  return out
}

/** Generic optional string cleaner for fields with no length cap (keyword, visual text, section id). */
export function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = collapse(value)
  return cleaned || null
}

const PINTEREST_SEO_INTENTS = new Set<PinterestSeoIntent>([
  'inspiration', 'how_to', 'shopping', 'planning', 'comparison',
  'checklist', 'recipe', 'education', 'local', 'brand_awareness',
])

export function cleanPinterestSeoIntent(value: unknown): PinterestSeoIntent | null {
  return typeof value === 'string' && PINTEREST_SEO_INTENTS.has(value as PinterestSeoIntent)
    ? (value as PinterestSeoIntent)
    : null
}

export interface ResolvedPinterestText {
  title: string | null
  description: string | null
  altText: string | null
  boardSectionId: string | null
  primaryKeyword: string | null
  keywords: string[]
  secondaryKeywords: string[]
  visualText: string | null
  seoIntent: PinterestSeoIntent | null
}

/**
 * Resolves Pinterest-native text fields, preferring platform-specific content and
 * falling back to generic output fields for title/description/alt text. Returns nulls
 * rather than throwing — callers (validation, publish) decide what is required.
 */
export function resolvePinterestText(
  output: Output,
  asset?: { altText?: string | null } | null,
): ResolvedPinterestText {
  const p = output.content?.platforms?.pinterest ?? {}
  return {
    title:             cleanPinterestTitle(p.title) || cleanPinterestTitle(output.title),
    description:       cleanPinterestDescription(p.description) || cleanPinterestDescription(output.content?.body),
    altText:           cleanPinterestAltText(p.altText) || cleanPinterestAltText(asset?.altText) || null,
    boardSectionId:    cleanOptionalString(p.boardSectionId),
    primaryKeyword:    cleanOptionalString(p.primaryKeyword),
    keywords:          cleanPinterestKeywords(p.keywords),
    secondaryKeywords: cleanPinterestKeywords(p.secondaryKeywords),
    visualText:        cleanOptionalString(p.visualText),
    seoIntent:         cleanPinterestSeoIntent(p.seoIntent),
  }
}
