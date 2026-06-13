import { describe, it, expect } from 'vitest'
import { mergeIntoCache } from '@/app/api/website-intelligence/_cache'
import type { CacheShape } from '@/app/api/website-intelligence/_cache'
import type { WebsiteAnalysisResult } from '@/lib/website-intelligence/analyze'

function result(
  items: Array<{ id: string; title?: string }>,
  gaps: Array<{ id: string; headline?: string }> = [],
  assets: Array<{ id: string }> = [],
): WebsiteAnalysisResult {
  return {
    // Cast through unknown — the test only exercises id/title merge behavior.
    items: items as unknown as WebsiteAnalysisResult['items'],
    gaps: gaps as unknown as WebsiteAnalysisResult['gaps'],
    assets: assets as unknown as WebsiteAnalysisResult['assets'],
    meta: { extractionMethod: 'readability', durationMs: 1, version: 1 },
  }
}

const emptyCache: CacheShape = { items: [], gaps: [], assets: [] }

describe('mergeIntoCache', () => {
  it('preserves existing items that are absent from the new result', () => {
    // The core "blog posts stay there" guarantee: a re-analysis that no longer
    // contains a previously-discovered post must NOT wipe it from the cache.
    const existing: CacheShape = {
      items: [{ id: 'blog-1', title: 'Old blog post' }],
      gaps: [],
      assets: [],
    }
    const merged = mergeIntoCache(existing, result([{ id: 'home-1', title: 'Homepage' }]))
    const ids = (merged.items as Array<{ id: string }>).map(i => i.id)
    expect(ids).toContain('blog-1')
    expect(ids).toContain('home-1')
  })

  it('keeps the existing version on id collision by default (append-only)', () => {
    const existing: CacheShape = {
      items: [{ id: 'opp-1', title: 'Original' }],
      gaps: [],
      assets: [],
    }
    const merged = mergeIntoCache(existing, result([{ id: 'opp-1', title: 'Updated' }]))
    const item = (merged.items as Array<{ id: string; title: string }>).find(i => i.id === 'opp-1')!
    expect(item.title).toBe('Original')
    expect(merged.items).toHaveLength(1)
  })

  it('refreshes the colliding item with the new version when preferNew is set', () => {
    // The re-analyze path wants fresh content where it re-discovers a page, while
    // still preserving everything it did not re-discover.
    const existing: CacheShape = {
      items: [
        { id: 'opp-1', title: 'Original' },
        { id: 'blog-7', title: 'Untouched blog post' },
      ],
      gaps: [],
      assets: [],
    }
    const merged = mergeIntoCache(
      existing,
      result([{ id: 'opp-1', title: 'Updated' }]),
      { preferNew: true },
    )
    const items = merged.items as Array<{ id: string; title: string }>
    expect(items.find(i => i.id === 'opp-1')!.title).toBe('Updated')
    expect(items.find(i => i.id === 'blog-7')!.title).toBe('Untouched blog post')
    expect(items).toHaveLength(2)
  })

  it('starts from empty and adds everything', () => {
    const merged = mergeIntoCache(emptyCache, result([{ id: 'a' }, { id: 'b' }]))
    expect(merged.items).toHaveLength(2)
  })
})
