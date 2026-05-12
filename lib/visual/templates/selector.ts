// lib/visual/templates/selector.ts
// Deterministic template selection — archetype + content type → TemplateId.
// NOT random. NOT user-driven in system mode. NOT a probability distribution.
// This is the taste policy. Adjust it here, nowhere else.

import type { TemplateId } from '../types/template'
import type { BrandArchetype } from '../grammar/archetypeGrammar'

export type ContentType = 'quote' | 'statistic' | 'opinion' | 'story' | 'announcement'

export function selectTemplate(
  archetype: BrandArchetype,
  contentType: ContentType,
  signatureTemplateId?: TemplateId | null
): TemplateId {
  // Signature Mode: creator has pinned a preferred template
  if (signatureTemplateId) return signatureTemplateId

  // Content type overrides archetype for specific structural cases
  if (contentType === 'statistic') return 'stat-monument'
  if (contentType === 'quote')     return 'quote-monolith'

  // Archetype default for everything else
  switch (archetype) {
    case 'Editorial': return 'editorial-hero'
    case 'Technical': return 'stat-monument'
    case 'Human':     return 'editorial-hero'   // authority-frame in Phase 2.1
    case 'Bold':      return 'quote-monolith'
    default:          return 'editorial-hero'
  }
}

// Infers content type from content string using simple heuristics.
// Good enough for MVP — improve from data later.
export function inferContentType(content: string): ContentType {
  const lower = content.toLowerCase()

  // Statistic signals: numbers with %, $, or standalone large numbers
  if (/\b\d+(\.\d+)?[%$kKmMbB]\b/.test(content) || /\b\d{4,}\b/.test(content)) return 'statistic'

  // Quote signals: quotation marks or "says" attribution
  if (/[""]/.test(content) || /\b(says?|said|stated|quote|according to)\b/i.test(content)) return 'quote'

  // Opinion signals: contrarian or bold claim markers
  if (/\b(wrong|mistake|actually|unpopular|hot take|truth is|real reason)\b/i.test(lower)) return 'opinion'

  // Story signals: past tense narrative
  if (/\b(i (was|had|learned|realized|discovered))\b/i.test(lower)) return 'story'

  return 'opinion'  // default: opinion/authority framing
}
