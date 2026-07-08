// lib/visual/generation/deriveOverlayCopy.ts
// Derives short overlay copy (headline + optional subtext) for a branded image
// card from a post body. Used by the auto "LinkedIn Image Post" flow so the
// composited editorial-hero card carries punchy, on-brand text.
//
// Two paths, same shape:
//   - deriveOverlayCopy()   → Claude, for the best phrasing
//   - fallbackOverlayCopy() → deterministic, no AI; guarantees usable copy when
//     the AI call fails or times out (never a silent downgrade to a plain image)
//
// Both run their output through sanitizeOverlayText so a headline never carries
// surrounding quotes, hashtags, URLs, or runaway length into the renderer.

import { callClaude } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'

export interface OverlayCopy {
  headline: string
  subtext?: string
}

const MAX_HEADLINE_WORDS = 8
const MAX_SUBTEXT_WORDS = 20
const MAX_HEADLINE_CHARS = 80
const MAX_SUBTEXT_CHARS = 160

const SYSTEM_PROMPT = `You write concise overlay copy for a single branded social image.
You return ONLY valid JSON — no explanation, no markdown.
Rules:
- headline: max ${MAX_HEADLINE_WORDS} words. A clear, self-contained, declarative statement a reader grasps instantly WITHOUT seeing the post.
- The headline must be a complete thought. Do NOT use elliptical or parallel constructions that drop an implied word (avoid "X, not Y" / "It's the A, not the B" patterns), trailing fragments, ellipsis, hashtags, emoji, or surrounding quotes. Prefer fewer words over a clever-but-confusing phrase.
- subtext: optional, max ${MAX_SUBTEXT_WORDS} words — supporting context only
- Be ruthlessly concise — white space is the design`

/**
 * Strip text down to something safe to composite onto an image:
 * remove URLs, hashtags, leading/trailing quotes & punctuation, collapse
 * whitespace, then hard-cap by words and characters.
 */
export function sanitizeOverlayText(raw: string, maxWords: number, maxChars: number): string {
  let text = (raw ?? '')
    .replace(/https?:\/\/\S+/gi, ' ')   // URLs
    .replace(/[#@]\S+/g, ' ')           // hashtags / mentions
    .replace(/[*_`>]/g, ' ')            // stray markdown
    .replace(/\s+/g, ' ')
    .trim()
    // strip wrapping quotes the model sometimes adds
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/, '')
    .trim()

  const words = text.split(' ').filter(Boolean)
  if (words.length > maxWords) text = words.slice(0, maxWords).join(' ')
  if (text.length > maxChars) text = text.slice(0, maxChars).trim()
  // drop a dangling trailing comma/semicolon/dash left by truncation
  return text.replace(/[\s,;:–—-]+$/, '').trim()
}

function clean(copy: { headline?: string; subtext?: string }): OverlayCopy {
  const headline = sanitizeOverlayText(copy.headline ?? '', MAX_HEADLINE_WORDS, MAX_HEADLINE_CHARS)
  const subtextRaw = sanitizeOverlayText(copy.subtext ?? '', MAX_SUBTEXT_WORDS, MAX_SUBTEXT_CHARS)
  return { headline, subtext: subtextRaw || undefined }
}

/**
 * AI-derived overlay copy. Throws on an empty/unusable result so callers fall
 * back deterministically.
 */
export async function deriveOverlayCopy(content: string, direction?: string): Promise<OverlayCopy> {
  // The creator's image direction informs the *tone and framing* of the copy — it must
  // not be transcribed literally into the headline (e.g. "no people, dark navy" is art
  // direction, not a headline). Only include it when present.
  const directionLines = direction
    ? [
        '',
        `Creator's image direction: ${direction}`,
        'Use this to inform the visual mood, specificity, and framing of the overlay copy where natural. Do not force literal visual details into the headline or subtext unless they are relevant to the post\'s message.',
      ]
    : []

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: [
      'Extract the strongest overlay copy for a branded image from this post.',
      '',
      'Post:',
      content,
      ...directionLines,
      '',
      'Return JSON: { "headline": string, "subtext"?: string }',
    ].join('\n'),
    maxTokens: 200,
    temperature: 0.4,
  })

  const raw = parseJson<{ headline?: string; subtext?: string }>(result.content)
  const copy = clean(raw)
  if (!copy.headline) {
    throw new Error('deriveOverlayCopy: empty headline')
  }
  return copy
}

/**
 * Deterministic fallback — no AI. Takes the first sentence/clause as the
 * headline and the next as optional subtext. Always returns a usable headline
 * as long as `content` has any words.
 */
export function fallbackOverlayCopy(content: string): OverlayCopy {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim()
  // Split on sentence terminators / hard breaks while keeping it simple.
  const segments = normalized
    .split(/(?<=[.!?])\s+|\n+|[–—|]/)
    .map(s => s.trim())
    .filter(Boolean)

  const headline = sanitizeOverlayText(segments[0] ?? normalized, MAX_HEADLINE_WORDS, MAX_HEADLINE_CHARS)
  const subtextCandidate = segments[1] ?? ''
  const subtext = sanitizeOverlayText(subtextCandidate, MAX_SUBTEXT_WORDS, MAX_SUBTEXT_CHARS)

  return { headline, subtext: subtext || undefined }
}
