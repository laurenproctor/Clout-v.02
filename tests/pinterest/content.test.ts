import { describe, it, expect } from 'vitest'
import {
  resolvePinterestText,
  cleanPinterestTitle,
  cleanPinterestDescription,
  cleanPinterestAltText,
  cleanPinterestKeywords,
  cleanOptionalString,
  cleanPinterestSeoIntent,
} from '@/lib/pinterest/content'
import type { Output, PinterestPlatformContent } from '@/types/domain'

// Minimal Output factory — the resolver only reads content + title.
function makeOutput(opts: {
  title?: unknown
  body?: unknown
  pinterest?: Partial<PinterestPlatformContent> | Record<string, unknown>
}): Output {
  return {
    title: opts.title as string | null,
    content: {
      body: opts.body as string,
      ...(opts.pinterest ? { platforms: { pinterest: opts.pinterest } } : {}),
    },
  } as unknown as Output
}

describe('clean helpers', () => {
  it('trims, collapses whitespace, and caps title at 100', () => {
    expect(cleanPinterestTitle('  Small   bedroom   ideas  ')).toBe('Small bedroom ideas')
    expect(cleanPinterestTitle('a'.repeat(150))).toHaveLength(100)
    expect(cleanPinterestTitle('   ')).toBeNull()
  })

  it('caps description and alt text at 500', () => {
    expect(cleanPinterestDescription('x'.repeat(600))).toHaveLength(500)
    expect(cleanPinterestAltText('y'.repeat(600))).toHaveLength(500)
  })

  it('returns null for non-string inputs (JSONB safety)', () => {
    expect(cleanPinterestTitle(42)).toBeNull()
    expect(cleanPinterestDescription({})).toBeNull()
    expect(cleanPinterestAltText(null)).toBeNull()
    expect(cleanOptionalString(['a'])).toBeNull()
  })

  it('caps each keyword at 80 chars, dedupes case-insensitively, caps list at 12', () => {
    const out = cleanPinterestKeywords(['Cozy', 'cozy', '  cozy  ', 'z'.repeat(100)])
    expect(out).toEqual(['Cozy', 'z'.repeat(80)])

    const many = Array.from({ length: 30 }, (_, i) => `kw${i}`)
    expect(cleanPinterestKeywords(many)).toHaveLength(12)
  })

  it('keyword cleaner is safe with non-array and non-string items', () => {
    expect(cleanPinterestKeywords('not an array')).toEqual([])
    expect(cleanPinterestKeywords([1, null, {}, 'ok', ''])).toEqual(['ok'])
  })

  it('validates seo intent against the allowed set', () => {
    expect(cleanPinterestSeoIntent('planning')).toBe('planning')
    expect(cleanPinterestSeoIntent('not-an-intent')).toBeNull()
    expect(cleanPinterestSeoIntent(123)).toBeNull()
  })
})

describe('resolvePinterestText — field priority', () => {
  it('prefers platform title over output.title', () => {
    const o = makeOutput({ title: 'Generic post title', pinterest: { title: 'Small bedroom layout ideas' } })
    expect(resolvePinterestText(o).title).toBe('Small bedroom layout ideas')
  })

  it('falls back to output.title when no platform title', () => {
    const o = makeOutput({ title: 'Generic post title' })
    expect(resolvePinterestText(o).title).toBe('Generic post title')
  })

  it('prefers platform description over output.content.body', () => {
    const o = makeOutput({ body: 'generic body', pinterest: { description: 'Explore small bedroom ideas...' } })
    expect(resolvePinterestText(o).description).toBe('Explore small bedroom ideas...')
  })

  it('falls back to output.content.body when no platform description', () => {
    const o = makeOutput({ body: 'generic body' })
    expect(resolvePinterestText(o).description).toBe('generic body')
  })

  it('prefers platform alt text over the asset alt text', () => {
    const o = makeOutput({ pinterest: { altText: 'platform alt' } })
    expect(resolvePinterestText(o, { altText: 'asset alt' }).altText).toBe('platform alt')
  })

  it('falls back to asset alt text, then null', () => {
    const o = makeOutput({})
    expect(resolvePinterestText(o, { altText: 'asset alt' }).altText).toBe('asset alt')
    expect(resolvePinterestText(o).altText).toBeNull()
  })

  it('resolves secondaryKeywords the same way as keywords', () => {
    const o = makeOutput({
      pinterest: { keywords: ['a', 'A'], secondaryKeywords: ['b', 'b', '  '] },
    })
    const r = resolvePinterestText(o)
    expect(r.keywords).toEqual(['a'])
    expect(r.secondaryKeywords).toEqual(['b'])
  })
})

describe('resolvePinterestText — malformed JSONB durability', () => {
  it('survives non-string values without throwing and returns safe fallbacks/nulls', () => {
    const o = makeOutput({
      title: 'Fallback title',
      body: 'Fallback body',
      pinterest: {
        title: 42,
        description: { nested: true },
        boardSectionId: 7,
        primaryKeyword: [],
        visualText: false,
        seoIntent: 'bogus',
        keywords: 'not-array',
        secondaryKeywords: [1, 2, 3],
      } as unknown as PinterestPlatformContent,
    })
    const r = resolvePinterestText(o)
    expect(r.title).toBe('Fallback title')          // malformed platform title → generic fallback
    expect(r.description).toBe('Fallback body')      // malformed platform description → generic fallback
    expect(r.boardSectionId).toBeNull()
    expect(r.primaryKeyword).toBeNull()
    expect(r.visualText).toBeNull()
    expect(r.seoIntent).toBeNull()
    expect(r.keywords).toEqual([])
    expect(r.secondaryKeywords).toEqual([])
  })
})
