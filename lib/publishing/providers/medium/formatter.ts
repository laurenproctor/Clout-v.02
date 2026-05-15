import { canonicalBodyToHtml, finalizeHtmlForMedium } from '@/lib/publishing/formatters/providers/html'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import type { EditorialProfile } from '@/lib/publishing/editorial/types'

// ─── Formatter Warnings ───────────────────────────────────────────────────────
// Non-mutating advisory diagnostics. The formatter emits warnings but never acts
// on them. Surfaced in the editorial preview UI — never silently applied.

export interface FormatterWarning {
  type: 'list_heavy' | 'cta_detected' | 'subtitle_rendering' | 'tags_truncated' | 'relative_images'
  message: string
}

export interface FormatterResult {
  html: string
  warnings: FormatterWarning[]
}

const MAX_MEDIUM_TAGS = 5

// Patterns that suggest CTA language in the final paragraph
const CTA_PATTERNS = [
  /follow me/i,
  /subscribe/i,
  /clap if/i,
  /let me know in the comments/i,
  /share this/i,
  /hit the like/i,
  /link in bio/i,
]

export function transformOutputForMedium(
  article: CanonicalArticle,
  profile: EditorialProfile,
): FormatterResult {
  const warnings: FormatterWarning[] = []

  // 1. Build base HTML from canonical body
  const rawHtml = canonicalBodyToHtml(article.body)

  // 2. Prepend subtitle as <p><em>…</em></p> if present
  // Medium renders the first italic paragraph as a visible subtitle/dek below the title.
  let html = rawHtml
  const subtitle = profile.editorial.dek ?? profile.editorial.subtitle
  if (subtitle?.trim()) {
    html = `<p><em>${subtitle.trim()}</em></p>\n\n${html}`
    warnings.push({
      type: 'subtitle_rendering',
      message: `Subtitle rendered as an italic opening paragraph. Verify display in Medium's editor on both mobile and desktop before publishing.`,
    })
  }

  // 3. Apply Medium-specific HTML finalization
  html = finalizeHtmlForMedium(html)

  // 4. Check for relative images removed by finalizeHtmlForMedium
  if (html.includes('<!-- image removed: relative URL not supported -->')) {
    warnings.push({
      type: 'relative_images',
      message: 'One or more images were removed because Medium requires absolute URLs. Upload images to a public host before publishing.',
    })
  }

  // 5. Tag truncation warning
  const tags = profile.narrative.tags ?? []
  if (tags.length > MAX_MEDIUM_TAGS) {
    warnings.push({
      type: 'tags_truncated',
      message: `${tags.length} tags provided — Medium supports up to ${MAX_MEDIUM_TAGS}. Only the first ${MAX_MEDIUM_TAGS} will be used.`,
    })
  }

  // 6. List-heavy content advisory
  const listCount = article.body.filter(n => n.type === 'list').length
  if (listCount > 3) {
    warnings.push({
      type: 'list_heavy',
      message: `${listCount} list blocks detected. Medium's editorial register favors prose over lists — consider converting some to flowing paragraphs for better reader engagement.`,
    })
  }

  // 7. CTA in final paragraph advisory
  const paragraphs = article.body.filter(n => n.type === 'paragraph')
  const lastParagraph = paragraphs[paragraphs.length - 1]
  if (lastParagraph && lastParagraph.type === 'paragraph') {
    const hasCta = CTA_PATTERNS.some(p => p.test(lastParagraph.html))
    if (hasCta) {
      warnings.push({
        type: 'cta_detected',
        message: 'The closing paragraph may contain a call-to-action. Medium readers respond poorly to explicit CTAs — consider ending with a resolved thought instead.',
      })
    }
  }

  return { html, warnings }
}
