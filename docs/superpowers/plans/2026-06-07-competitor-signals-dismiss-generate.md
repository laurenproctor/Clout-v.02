# Competitor Signals: Dismiss + Generate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Dismiss and Generate buttons to Competitor Intelligence feed cards, scraping article content to generate original posts for any network without attributing the competitor source.

**Architecture:** New `isSafeUrl` utility + pure helper functions (testable) in `lib/`, a new `/api/draft/competitor-intel` route using workspace brand context and `callClaude`, a new `CompetitorIntelDraftPanel` component, and targeted modifications to `CompetitorIntelligenceFeed.tsx` for dismiss state and button rendering.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Claude (`callClaude` from `lib/ai/generate`), Supabase (workspace brand context only — no DB caching for drafts)

---

## File Map

| Status | Path | Responsibility |
|--------|------|---------------|
| Create | `lib/scraper/isSafeUrl.ts` | SSRF validation before any scrape |
| Create | `lib/draft/competitorIntelHelpers.ts` | Pure functions: context builder, system prompt builder, user prompt builder |
| Create | `app/api/draft/competitor-intel/route.ts` | Generation endpoint: validate → context → brand lookup → callClaude |
| Create | `components/feed/CompetitorIntelDraftPanel.tsx` | Draft panel UI: network tabs, tone, text area, Copy + Regenerate |
| Modify | `components/feed/CompetitorIntelligenceFeed.tsx` | Add dismiss state + filtering; update `ContentCard` with buttons + panel |
| Create | `tests/scraper/isSafeUrl.test.ts` | Tests for SSRF utility |
| Create | `tests/draft/competitorIntelHelpers.test.ts` | Tests for pure helper functions |

---

## Task 1: `isSafeUrl` — SSRF validation utility

**Files:**
- Create: `lib/scraper/isSafeUrl.ts`
- Create: `tests/scraper/isSafeUrl.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `tests/scraper/isSafeUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isSafeUrl } from '@/lib/scraper/isSafeUrl'

describe('isSafeUrl', () => {
  it('accepts a valid public HTTPS URL', () => {
    expect(isSafeUrl('https://example.com/article')).toBe(true)
  })

  it('rejects HTTP (non-HTTPS)', () => {
    expect(isSafeUrl('http://example.com/article')).toBe(false)
  })

  it('rejects a malformed URL', () => {
    expect(isSafeUrl('not-a-url')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isSafeUrl('')).toBe(false)
  })

  it('rejects localhost', () => {
    expect(isSafeUrl('https://localhost/admin')).toBe(false)
  })

  it('rejects 127.0.0.1', () => {
    expect(isSafeUrl('https://127.0.0.1/secret')).toBe(false)
  })

  it('rejects IPv6 loopback ::1', () => {
    expect(isSafeUrl('https://[::1]/secret')).toBe(false)
  })

  it('rejects 10.x.x.x private range', () => {
    expect(isSafeUrl('https://10.0.0.1/internal')).toBe(false)
  })

  it('rejects 192.168.x.x private range', () => {
    expect(isSafeUrl('https://192.168.1.1/internal')).toBe(false)
  })

  it('rejects 172.16.x.x private range', () => {
    expect(isSafeUrl('https://172.16.0.1/internal')).toBe(false)
  })

  it('rejects 172.31.x.x private range', () => {
    expect(isSafeUrl('https://172.31.255.255/internal')).toBe(false)
  })

  it('accepts 172.32.x.x (outside private range)', () => {
    expect(isSafeUrl('https://172.32.0.1/page')).toBe(true)
  })

  it('rejects AWS/GCP/Azure IMDS endpoint', () => {
    expect(isSafeUrl('https://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects GCP metadata endpoint', () => {
    expect(isSafeUrl('https://metadata.google.internal/computeMetadata/v1/')).toBe(false)
  })
})
```

- [ ] **Step 1.2: Run tests — verify they fail**

```bash
npx vitest run tests/scraper/isSafeUrl.test.ts
```

Expected: all tests fail with "Cannot find module"

- [ ] **Step 1.3: Implement `isSafeUrl`**

Create `lib/scraper/isSafeUrl.ts`:

```ts
export function isSafeUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false

  const host = parsed.hostname.toLowerCase()

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
  if (/^10\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
  if (host === '169.254.169.254') return false
  if (host === 'metadata.google.internal') return false

  return true
}
```

- [ ] **Step 1.4: Run tests — verify they pass**

```bash
npx vitest run tests/scraper/isSafeUrl.test.ts
```

Expected: all 14 tests pass

- [ ] **Step 1.5: Commit**

```bash
git add lib/scraper/isSafeUrl.ts tests/scraper/isSafeUrl.test.ts
git commit -m "feat: add isSafeUrl SSRF validation utility"
```

---

## Task 2: `competitorIntelHelpers` — pure generation helpers

**Files:**
- Create: `lib/draft/competitorIntelHelpers.ts`
- Create: `tests/draft/competitorIntelHelpers.test.ts`

- [ ] **Step 2.1: Write the failing tests**

Create `tests/draft/competitorIntelHelpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildArticleContext,
  buildSystemPrompt,
  buildUserPrompt,
} from '@/lib/draft/competitorIntelHelpers'

// ── buildArticleContext ────────────────────────────────────────────────────

describe('buildArticleContext', () => {
  const base = {
    scraped: null,
    item_content: null,
    item_summary: null,
    item_title: 'AI is changing healthcare',
    item_topics: ['AI', 'Healthcare'],
  }

  it('prefers scraped content when available', () => {
    const result = buildArticleContext({ ...base, scraped: 'Full scraped article...' })
    expect(result).toContain('Full scraped article...')
  })

  it('falls back to item_content when no scraped content', () => {
    const result = buildArticleContext({ ...base, item_content: 'RSS excerpt content' })
    expect(result).toBe('RSS excerpt content')
  })

  it('falls back to item_summary when no content', () => {
    const result = buildArticleContext({ ...base, item_summary: 'Article summary here' })
    expect(result).toBe('Article summary here')
  })

  it('falls back to title + topics when all others are empty', () => {
    const result = buildArticleContext(base)
    expect(result).toContain('AI is changing healthcare')
    expect(result).toContain('AI')
    expect(result).toContain('Healthcare')
  })

  it('prefers item_content over item_summary', () => {
    const result = buildArticleContext({ ...base, item_content: 'Content', item_summary: 'Summary' })
    expect(result).toBe('Content')
  })

  it('caps scraped content at 8000 characters', () => {
    const long = 'x'.repeat(10000)
    const result = buildArticleContext({ ...base, scraped: long })
    expect(result.length).toBe(8000)
  })

  it('handles whitespace-only strings as empty', () => {
    const result = buildArticleContext({ ...base, item_content: '   ', item_summary: 'Summary' })
    expect(result).toBe('Summary')
  })
})

// ── buildSystemPrompt ──────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  const base = {
    brandName: 'Acme Corp',
    toneTraits: ['direct', 'confident'],
    contentTopics: ['Supply Chain', 'Operations'],
    services: ['Consulting', 'Training'],
    competitorDomain: 'competitor.com',
  }

  it('includes the brand name', () => {
    expect(buildSystemPrompt(base)).toContain('Acme Corp')
  })

  it('includes tone traits', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('direct')
    expect(result).toContain('confident')
  })

  it('includes content topics', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('Supply Chain')
  })

  it('includes the competitor domain in the attribution rule', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('competitor.com')
  })

  it('includes the no-attribution hard rule', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('NON-NEGOTIABLE')
    expect(result).toContain('Do not link to')
  })

  it('handles null brandName gracefully', () => {
    const result = buildSystemPrompt({ ...base, brandName: null })
    expect(result).toBeTruthy()
    expect(result).not.toContain('null')
  })

  it('works with empty arrays', () => {
    const result = buildSystemPrompt({ ...base, toneTraits: [], contentTopics: [], services: [] })
    expect(result).toContain('competitor.com')
  })
})

// ── buildUserPrompt ────────────────────────────────────────────────────────

describe('buildUserPrompt', () => {
  const base = {
    articleContext: 'AI is reshaping enterprise software.',
    format: 'linkedin',
    tone: 'authoritative',
  }

  it('includes the article context', () => {
    expect(buildUserPrompt(base)).toContain('AI is reshaping enterprise software.')
  })

  it('includes the format', () => {
    expect(buildUserPrompt(base)).toContain('linkedin')
  })

  it('includes the tone', () => {
    expect(buildUserPrompt(base)).toContain('authoritative')
  })

  it('includes linkedin format instructions', () => {
    expect(buildUserPrompt(base)).toContain('1200')
  })

  it('includes twitter format instructions', () => {
    const result = buildUserPrompt({ ...base, format: 'twitter' })
    expect(result).toContain('280')
  })

  it('includes instagram format instructions', () => {
    const result = buildUserPrompt({ ...base, format: 'instagram' })
    expect(result).toContain('hashtags')
  })
})
```

- [ ] **Step 2.2: Run tests — verify they fail**

```bash
npx vitest run tests/draft/competitorIntelHelpers.test.ts
```

Expected: all tests fail with "Cannot find module"

- [ ] **Step 2.3: Implement the helper functions**

Create `lib/draft/competitorIntelHelpers.ts`:

```ts
const FORMAT_INSTRUCTIONS: Record<string, string> = {
  linkedin:   '~1200 characters, professional narrative, 3–4 paragraphs, no hashtags',
  twitter:    '~280 characters, punchy, single insight, optional 1–2 hashtags',
  blog:       '~300 word intro paragraph, hook + context + thesis, no hashtags',
  newsletter: '~150 words, conversational, direct address to reader, no hashtags',
  instagram:  '~150 words + 5–8 relevant hashtags, visual storytelling language',
}

export function buildArticleContext(params: {
  scraped:      string | null
  item_content: string | null
  item_summary: string | null
  item_title:   string
  item_topics:  string[]
}): string {
  if (params.scraped?.trim()) return params.scraped.slice(0, 8000)
  if (params.item_content?.trim()) return params.item_content
  if (params.item_summary?.trim()) return params.item_summary

  return [params.item_title, params.item_topics.join(', ')]
    .filter(Boolean)
    .join(' — ')
}

export function buildSystemPrompt(params: {
  brandName:      string | null
  toneTraits:     string[]
  contentTopics:  string[]
  services:       string[]
  competitorDomain: string
}): string {
  const parts: string[] = []

  parts.push(
    `You are the editorial strategist for ${params.brandName ?? 'this brand'}.`
  )

  if (params.toneTraits.length > 0) {
    parts.push(`Voice and tone: ${params.toneTraits.join(', ')}`)
  }

  if (params.contentTopics.length > 0) {
    parts.push(`Authority areas: ${params.contentTopics.join(', ')}`)
  }

  if (params.services.length > 0) {
    parts.push(`Services: ${params.services.join(', ')}`)
  }

  parts.push(`ORIGINALITY AND ATTRIBUTION RULES — NON-NEGOTIABLE:
1. Use the signal only to identify the topic, trend, discussion, or market movement.
2. Do not summarize, paraphrase, reproduce, or closely mirror the source article.
3. Create an original perspective, framework, opinion, lesson, or insight that reflects the workspace's expertise and voice.
4. Do not link to, cite, mention, name, or attribute any content to ${params.competitorDomain} or any external competitor source.
5. Do not include any external URLs.
6. The output must read entirely as the workspace's original thought leadership. There should be no indication this content was informed by a competitor's article.`)

  return parts.join('\n\n')
}

export function buildUserPrompt(params: {
  articleContext: string
  format:         string
  tone:           string
}): string {
  const formatInstruction = FORMAT_INSTRUCTIONS[params.format] ?? 'concise and engaging'

  return `Write a ${params.format} post based on the following signal context.

Signal context:
${params.articleContext}

Requested tone: ${params.tone}
Format requirements:
- ${formatInstruction}

Write only the post content. No preamble, no labels, no explanation.`
}
```

- [ ] **Step 2.4: Run tests — verify they pass**

```bash
npx vitest run tests/draft/competitorIntelHelpers.test.ts
```

Expected: all 20 tests pass

- [ ] **Step 2.5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all existing tests continue to pass

- [ ] **Step 2.6: Commit**

```bash
git add lib/draft/competitorIntelHelpers.ts tests/draft/competitorIntelHelpers.test.ts
git commit -m "feat: add competitor intel draft helper functions"
```

---

## Task 3: `/api/draft/competitor-intel` route

**Files:**
- Create: `app/api/draft/competitor-intel/route.ts`

- [ ] **Step 3.1: Create the route**

Create `app/api/draft/competitor-intel/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { scrapeUrl } from '@/lib/scraper'
import { callClaude } from '@/lib/ai/generate'
import { isSafeUrl } from '@/lib/scraper/isSafeUrl'
import {
  buildArticleContext,
  buildSystemPrompt,
  buildUserPrompt,
} from '@/lib/draft/competitorIntelHelpers'
import type { DraftFormat, DraftTone } from '@/types/feed'

export const maxDuration = 60

const VALID_FORMATS: DraftFormat[] = ['linkedin', 'twitter', 'blog', 'newsletter', 'instagram']
const VALID_TONES: DraftTone[] = ['authoritative', 'conversational', 'provocative', 'educational']

interface RequestBody {
  item_id:           string
  item_url:          string
  item_title:        string
  item_summary:      string | null
  item_content:      string | null
  item_topics:       string[]
  competitor_domain: string
  format:            DraftFormat
  tone:              DraftTone
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    item_url,
    item_title,
    item_summary,
    item_content,
    item_topics,
    competitor_domain,
    format,
    tone,
  } = body

  if (!item_title || !competitor_domain || !format || !tone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  if (!VALID_TONES.includes(tone)) {
    return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })
  }

  // Determine article context.
  // Fast path: use pre-existing content from the feed item.
  // Scrape only when no existing content is available and the URL is safe.
  const hasExistingContent = !!(item_content?.trim() || item_summary?.trim())
  let scraped: string | null = null

  if (!hasExistingContent && item_url && isSafeUrl(item_url)) {
    try {
      const article = await scrapeUrl(item_url)
      scraped = article.markdownContent ?? null
    } catch {
      // Silent fallback — article context will use title/topics
    }
  }

  const articleContext = buildArticleContext({
    scraped,
    item_content: item_content ?? null,
    item_summary: item_summary ?? null,
    item_title,
    item_topics: item_topics ?? [],
  })

  // Fetch workspace brand context in parallel with Supabase query
  const supabase = await createClient()
  const [brandContext, feedSettingsResult] = await Promise.all([
    getBrandContext(),
    supabase
      .from('workspace_feed_settings')
      .select('content_topics, services, tone_preference')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
  ])

  const feedSettings = feedSettingsResult.data

  const systemPrompt = buildSystemPrompt({
    brandName:        brandContext.brandName,
    toneTraits:       brandContext.toneTraits,
    contentTopics:    feedSettings?.content_topics ?? [],
    services:         feedSettings?.services ?? [],
    competitorDomain: competitor_domain,
  })

  const userPrompt = buildUserPrompt({ articleContext, format, tone })

  try {
    const result = await callClaude({
      systemPrompt,
      userMessage: userPrompt,
      maxTokens:   600,
      temperature: 0.7,
    })

    return NextResponse.json({ draft: result.content })
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 502 })
  }
}
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "competitor-intel"
```

Expected: no output (no errors in the new file)

- [ ] **Step 3.3: Commit**

```bash
git add app/api/draft/competitor-intel/route.ts
git commit -m "feat: add /api/draft/competitor-intel generation route"
```

---

## Task 4: `CompetitorIntelDraftPanel` component

**Files:**
- Create: `components/feed/CompetitorIntelDraftPanel.tsx`

- [ ] **Step 4.1: Create the component**

Create `components/feed/CompetitorIntelDraftPanel.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { tokens } from '@/lib/feed/tokens'
import type { DraftFormat, DraftTone } from '@/types/feed'
import type { CompetitorContentItem } from '@/app/api/competitors/content/route'

const FORMATS: DraftFormat[] = ['linkedin', 'twitter', 'blog', 'newsletter', 'instagram']
const FORMAT_LABELS: Record<DraftFormat, string> = {
  linkedin:   'LinkedIn',
  twitter:    'Twitter',
  blog:       'Blog',
  newsletter: 'Newsletter',
  instagram:  'Instagram',
}
const TONES: DraftTone[] = ['authoritative', 'conversational', 'provocative', 'educational']
const TONE_LABELS: Record<DraftTone, string> = {
  authoritative: 'Authoritative',
  conversational: 'Conversational',
  provocative:   'Provocative',
  educational:   'Educational',
}

const EMPTY_DRAFTS: Record<DraftFormat, string> = {
  linkedin: '', twitter: '', blog: '', newsletter: '', instagram: '',
}

interface CompetitorIntelDraftPanelProps {
  item:    CompetitorContentItem
  isOpen:  boolean
  onClose: () => void
}

export function CompetitorIntelDraftPanel({ item, isOpen, onClose }: CompetitorIntelDraftPanelProps) {
  const [activeFormat, setActiveFormat] = useState<DraftFormat>('linkedin')
  const [activeTone, setActiveTone]     = useState<DraftTone>('authoritative')
  const [draftContent, setDraftContent] = useState<Record<DraftFormat, string>>(EMPTY_DRAFTS)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)

  const fetchDraft = useCallback(async (format: DraftFormat, tone: DraftTone) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/draft/competitor-intel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          item_id:           item.id,
          item_url:          item.url,
          item_title:        item.title ?? '',
          item_summary:      item.summary,
          item_content:      item.content,
          item_topics:       item.topics,
          competitor_domain: item.competitor_domain,
          format,
          tone,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to generate draft')
      setDraftContent(prev => ({ ...prev, [format]: data.draft }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [item])

  // Auto-fetch LinkedIn/Authoritative on open
  useEffect(() => {
    if (isOpen && !draftContent.linkedin) {
      fetchDraft('linkedin', 'authoritative')
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormatChange = (format: DraftFormat) => {
    setActiveFormat(format)
    if (!draftContent[format]) fetchDraft(format, activeTone)
  }

  const handleToneChange = (tone: DraftTone) => {
    setActiveTone(tone)
    fetchDraft(activeFormat, tone)
  }

  const handleRegenerate = () => {
    setDraftContent(prev => ({ ...prev, [activeFormat]: '' }))
    fetchDraft(activeFormat, activeTone)
  }

  const handleCopy = async () => {
    const text = draftContent[activeFormat]
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClose = () => {
    setActiveFormat('linkedin')
    setActiveTone('authoritative')
    setDraftContent({ ...EMPTY_DRAFTS })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const currentDraft = draftContent[activeFormat]

  return (
    <div style={{
      backgroundColor: tokens.colors.draftPanelBackground,
      borderTop:       `1px solid ${tokens.colors.draftPanelBorderTop}`,
      padding:         '14px 18px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontSize:      '11px',
          fontWeight:    700,
          textTransform: 'uppercase',
          letterSpacing: tokens.letterSpacing.draftHeader,
          color:         '#374151',
        }}>
          Generate from Competitor Signal
        </span>
        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: tokens.colors.sectionHeaderColor, padding: '0 2px', lineHeight: 1 }}
          aria-label="Close draft panel"
        >
          ×
        </button>
      </div>

      {/* Network tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {FORMATS.map(f => (
          <button
            key={f}
            onClick={() => handleFormatChange(f)}
            style={{
              padding:         '4px 10px',
              fontSize:        '12px',
              fontWeight:      500,
              borderRadius:    '3px',
              border:          'none',
              cursor:          'pointer',
              backgroundColor: activeFormat === f ? 'var(--workspace-accent, #1a1560)' : '#e5e7eb',
              color:           activeFormat === f ? tokens.colors.formatTabActiveText : '#6b7280',
              transition:      'background-color 0.1s',
            }}
          >
            {FORMAT_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Tone selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Tone:</span>
        <select
          value={activeTone}
          onChange={e => handleToneChange(e.target.value as DraftTone)}
          style={{ fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '3px 6px', backgroundColor: '#fff', color: '#374151', cursor: 'pointer' }}
        >
          {TONES.map(t => <option key={t} value={t}>{TONE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Draft content area */}
      {isLoading ? (
        <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.sectionHeaderColor, fontSize: '13px' }}>
          Drafting perspective...
        </div>
      ) : error ? (
        <div style={{ minHeight: '120px', padding: '12px 0' }}>
          <p style={{ color: '#991b1b', fontSize: '13px', marginBottom: '8px' }}>{error}</p>
          <button
            onClick={() => fetchDraft(activeFormat, activeTone)}
            style={{ padding: '5px 12px', fontSize: '12px', backgroundColor: 'var(--workspace-accent, #1a1560)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', minHeight: '120px', fontSize: '13px', lineHeight: '1.6', color: '#374151', padding: '10px 12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '3px' }}>
          {currentDraft || <span style={{ color: tokens.colors.sectionHeaderColor }}>Generating your draft...</span>}
        </div>
      )}

      {/* Copy + Regenerate — shown only once a draft exists */}
      {currentDraft && !isLoading && !error && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <button
            onClick={handleCopy}
            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500, backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleRegenerate}
            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500, backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer' }}
          >
            Regenerate
          </button>
        </div>
      )}

      {/* Attribution */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>
        <span style={{ display: 'inline-block', width: tokens.dimensions.signalAttrDotSize, height: tokens.dimensions.signalAttrDotSize, borderRadius: '50%', backgroundColor: tokens.colors.signalAttrDot, flexShrink: 0 }} />
        Signal source: Competitor Intelligence · Content generated from signal context
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "CompetitorIntelDraftPanel"
```

Expected: no output (no errors)

- [ ] **Step 4.3: Commit**

```bash
git add components/feed/CompetitorIntelDraftPanel.tsx
git commit -m "feat: add CompetitorIntelDraftPanel component"
```

---

## Task 5: Update `ContentCard` — add Dismiss + Generate buttons and panel

**Files:**
- Modify: `components/feed/CompetitorIntelligenceFeed.tsx`

The `ContentCard` function starts at line 77. It currently takes `{ item, index }` with no state, no callbacks, and a footer that renders only a "View →" link.

- [ ] **Step 5.1: Add the import and update `ContentCard`'s signature and state**

Open `components/feed/CompetitorIntelligenceFeed.tsx`. At the top, add the import for the panel alongside existing imports:

```ts
import { useState } from 'react'
import { CompetitorIntelDraftPanel } from './CompetitorIntelDraftPanel'
```

Then update the `ContentCard` function signature and add `panelOpen` state:

Find:
```tsx
function ContentCard({ item, index }: { item: CompetitorContentItem; index: number }) {
  const m = item.metrics ?? {}
```

Replace with:
```tsx
function ContentCard({ item, index, onDismiss }: { item: CompetitorContentItem; index: number; onDismiss?: (id: string) => void }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const m = item.metrics ?? {}
```

- [ ] **Step 5.2: Replace the footer with Dismiss + Generate buttons**

Find the existing footer block (the outermost `div` containing the metrics span and "View →" link):

```tsx
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          {metricParts.length > 0 && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {metricParts.join(' · ')}
            </span>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none', marginLeft: 'auto' }}
            >
              View →
            </a>
          )}
        </div>
```

Replace with:
```tsx
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metricParts.length > 0 && (
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                {metricParts.join(' · ')}
              </span>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}
              >
                View →
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onDismiss?.(item.id)}
              style={{
                padding:         '5px 10px',
                fontSize:        '12px',
                fontWeight:      500,
                backgroundColor: 'transparent',
                color:           '#9ca3af',
                border:          '1px solid #e5e7eb',
                borderRadius:    '3px',
                cursor:          'pointer',
              }}
              aria-label="Dismiss signal"
            >
              Dismiss
            </button>
            <button
              onClick={() => setPanelOpen(prev => !prev)}
              style={{
                padding:         '5px 12px',
                fontSize:        '12px',
                fontWeight:      600,
                backgroundColor: panelOpen ? '#374151' : 'var(--workspace-accent, #1a1560)',
                color:           '#fff',
                border:          'none',
                borderRadius:    '3px',
                cursor:          'pointer',
                transition:      'background-color 0.1s',
              }}
            >
              {panelOpen ? 'Close' : 'Generate'}
            </button>
          </div>
        </div>
```

- [ ] **Step 5.3: Add the panel below the card body, inside the card's outer div**

The card's outer `div` (the one with `border`, `borderRadius`, `backgroundColor`, `marginBottom`, `overflow: hidden`) currently contains only one child `div` (the `padding: '12px 16px'` body). Add the panel after that body div:

Find the closing of the card body div and the card's outer div. The card body ends after the footer we just updated. After the `</div>` that closes `<div style={{ padding: '12px 16px' }}>`, but still inside the outer card `div`, add:

```tsx
      <CompetitorIntelDraftPanel
        item={item}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
```

The full card structure should now be:
```tsx
  return (
    <div style={{ border: ..., borderRadius: ..., backgroundColor: ..., marginBottom: ..., overflow: 'hidden', ... }}>
      {/* thumbnail */}
      {item.thumbnail_url && item.url && ( ... )}

      <div style={{ padding: '12px 16px' }}>
        {/* header row */}
        {/* title */}
        {/* display text */}
        {/* topics */}
        {/* footer with View + Dismiss + Generate */}
      </div>

      <CompetitorIntelDraftPanel
        item={item}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
```

- [ ] **Step 5.4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "CompetitorIntelligenceFeed"
```

Expected: no output

- [ ] **Step 5.5: Commit**

```bash
git add components/feed/CompetitorIntelligenceFeed.tsx
git commit -m "feat: add Dismiss and Generate buttons to ContentCard"
```

---

## Task 6: Add dismiss state to `CompetitorIntelligenceFeed`

**Files:**
- Modify: `components/feed/CompetitorIntelligenceFeed.tsx`

The `CompetitorIntelligenceFeed` component starts at line 185 (after the `ContentCard` function). It currently maps items directly to `<ContentCard key={item.id} item={item} index={index} />`.

- [ ] **Step 6.1: Add `dismissedIds` state and filter**

Find the `CompetitorIntelligenceFeed` component function. It starts:

```tsx
export function CompetitorIntelligenceFeed({ items, loading, error, onRetry }: Props) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
```

Add `dismissedIds` state after the `useParams` line:

```tsx
export function CompetitorIntelligenceFeed({ items, loading, error, onRetry }: Props) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id))
  }

  const visibleItems = items.filter(item => !dismissedIds.has(item.id))
```

- [ ] **Step 6.2: Use `visibleItems` in the render and pass `onDismiss`**

Find the map in the return statement:

```tsx
      {items.map((item, index) => (
        <ContentCard key={item.id} item={item} index={index} />
      ))}
```

Replace with:

```tsx
      {visibleItems.map((item, index) => (
        <ContentCard key={item.id} item={item} index={index} onDismiss={handleDismiss} />
      ))}
```

Also update the item count display in the header label. Find:

```tsx
          Competitor Intelligence · {items.length} items
```

Replace with:

```tsx
          Competitor Intelligence · {visibleItems.length} items
```

- [ ] **Step 6.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "CompetitorIntelligenceFeed"
```

Expected: no output

- [ ] **Step 6.4: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6.5: Commit**

```bash
git add components/feed/CompetitorIntelligenceFeed.tsx
git commit -m "feat: add dismiss state to CompetitorIntelligenceFeed"
```

---

## Task 7: Manual smoke test

This feature requires a running app and a workspace with competitor data in the feed.

- [ ] **Step 7.1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 7.2: Navigate to the Competitor Intelligence tab**

Open the Signal Intelligence page and click the Competitors tab.

- [ ] **Step 7.3: Verify Dismiss**

Click **Dismiss** on one card. Confirm the card disappears immediately. Confirm the item count in the header decrements. Confirm other cards are unaffected.

- [ ] **Step 7.4: Verify Generate — card with a URL**

Click **Generate** on a card that has a "View →" link (has a URL). Confirm:
- Button label changes to "Close"
- Panel expands below the card
- LinkedIn tab is active and generation starts immediately
- A draft appears within ~10 seconds
- Draft does not contain the competitor domain name or any external URLs
- Draft sounds like original thought leadership, not a rewrite of the article

- [ ] **Step 7.5: Verify Generate — card without a URL**

Click **Generate** on a card with no "View →" link (a news signal card, `source_type: 'news'`). Confirm a draft is generated using the title/topics as context.

- [ ] **Step 7.6: Verify network tabs**

With a draft generated for LinkedIn, click Twitter. Confirm a new draft is fetched. Click LinkedIn again — confirm the cached draft is shown without a new fetch.

- [ ] **Step 7.7: Verify tone change**

Change the tone selector from Authoritative to Conversational. Confirm a new draft is fetched.

- [ ] **Step 7.8: Verify Regenerate**

Click **Regenerate**. Confirm a new draft is fetched for the current format/tone, replacing the previous one.

- [ ] **Step 7.9: Verify Copy**

Click **Copy**. Confirm the button reads "Copied!" for ~1.5 seconds. Paste somewhere and confirm the draft text was copied.

- [ ] **Step 7.10: Verify Close**

Click **Close** (the Generate button when panel is open). Confirm the panel collapses. Reopen — confirm the draft auto-fetches again (state was cleared on close).

- [ ] **Step 7.11: Final commit**

```bash
git add -p  # stage any final tweaks
git commit -m "feat: competitor signals dismiss + generate complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ Dismiss button on all cards (Task 5 + 6)
- ✅ Generate button on all cards, including no-URL cards (Task 3 context fallback + Task 5)
- ✅ Article scraping with fast-path preference for existing content (Task 3)
- ✅ SSRF protection before scrape (Task 1 + Task 3)
- ✅ No competitor attribution in output (Task 2 `buildSystemPrompt` hard rules)
- ✅ Originality constraint beyond attribution (Task 2 hard rules)
- ✅ Workspace brand context (`getBrandContext` + `workspace_feed_settings`, Task 3)
- ✅ Network tabs: LinkedIn, Twitter, Blog, Newsletter, Instagram (Task 4)
- ✅ Tone selector (Task 4)
- ✅ Copy + Regenerate actions (Task 4)
- ✅ Component-state caching, no DB (Task 4 `draftContent` record)
- ✅ State resets on panel close (Task 4 `handleClose`)
- ✅ Item count reflects dismissed cards (Task 6)
- ✅ No changes to DraftPanel, SignalCard, CompetitorPostCard, CompetitorCard

**Placeholder scan:** No TBDs, no "similar to above", all steps include complete code.

**Type consistency:**
- `CompetitorContentItem` used identically in Tasks 4, 5, 6
- `DraftFormat` / `DraftTone` imported from `@/types/feed` in Tasks 2, 3, 4
- `buildArticleContext`, `buildSystemPrompt`, `buildUserPrompt` — names match across Tasks 2 and 3
- `isSafeUrl` — name matches across Tasks 1 and 3
- `onDismiss?: (id: string) => void` — matches between Tasks 5 and 6
