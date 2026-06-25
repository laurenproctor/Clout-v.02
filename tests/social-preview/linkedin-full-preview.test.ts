import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SocialPreview } from '@/components/social-preview/SocialPreview'
import type { PreviewData } from '@/components/social-preview/core/types'

// Renderer-level verification of the preview-first behavior change:
//   mode="full"  → density 'expanded' → complete body, NO "see more" truncation
//   mode="compact" → density 'standard' → 140-char "see more" truncation preserved
//   mode="mini"  → 2-line clamp preserved (no "see more" button)
// Runs under vitest's node env via react-dom/server — no browser/auth needed.

const FIRST = 'Most teams treat content like exhaust — publish it and move on.'
const LAST = 'That is the difference between being busy and compounding.'
const LONG_BODY = [
  FIRST,
  '',
  'But the real leverage is treating every post as a durable, reviewable artifact that can be scheduled, measured, and improved over time.',
  '',
  LAST,
].join('\n')

function data(overrides: Partial<PreviewData> = {}): PreviewData {
  return {
    platform: 'linkedin',
    author: { name: 'Test User', subtitle: 'Founder' },
    body: LONG_BODY,
    hashtags: [],
    ...overrides,
  }
}

function html(d: PreviewData, mode: 'full' | 'compact' | 'mini') {
  return renderToStaticMarkup(createElement(SocialPreview, { data: d, mode, theme: 'light' }))
}

// Static markup escapes the "—" em dash etc.; normalize entities for plain matching.
function decode(s: string) {
  return s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2014;|&mdash;/g, '—')
}

describe('LinkedIn full preview (mode="full" → expanded density)', () => {
  it('renders the COMPLETE post with no "see more" truncation', () => {
    const out = decode(html(data(), 'full'))
    expect(out).toContain(FIRST)
    expect(out).toContain(LAST) // last paragraph present → not truncated
    expect(out.toLowerCase()).not.toContain('see more')
  })

  it('preserves paragraph breaks (whitespace-pre-wrap)', () => {
    const out = html(data(), 'full')
    expect(out).toMatch(/pre-wrap/)
  })

  it('appends structured hashtags without duplicating ones already in the body', () => {
    const body = `${FIRST}\n\n#Foo`
    const out = decode(html(data({ body, hashtags: ['Foo', 'Bar'] }), 'full'))
    // #Foo already in body → not appended a second time.
    expect(out.match(/#Foo/g) ?? []).toHaveLength(1)
    // #Bar not in body → appended once.
    expect(out.match(/#Bar/g) ?? []).toHaveLength(1)
  })
})

describe('compact / mini previews keep their existing truncation (regression guard)', () => {
  it('compact still truncates a long body with a "see more" affordance', () => {
    const out = decode(html(data(), 'compact'))
    expect(out.toLowerCase()).toContain('see more')
    expect(out).not.toContain(LAST) // tail hidden behind "see more"
  })

  it('mini clamps without a "see more" button', () => {
    const out = decode(html(data(), 'mini'))
    expect(out.toLowerCase()).not.toContain('see more')
    expect(out).toMatch(/-webkit-line-clamp|WebkitLineClamp/i)
  })
})
