import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Output, PinterestPlatformContent } from '@/types/domain'

// ── Master switch ──────────────────────────────────────────────────────────────
const gate = vi.hoisted(() => ({ pinterest: true }))
vi.mock('@/lib/features', () => ({
  FEATURES: { get pinterestPublishing() { return gate.pinterest } },
}))

// ── Channel lookup: always a connected Pinterest channel ─────────────────────────
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { platform: 'pinterest' } }) }),
      }),
    }),
  }),
}))

// ── Board + destination resolve successfully so only title/desc/warnings vary ────
vi.mock('@/lib/pinterest/boards', () => ({ resolveBoardForOutput: vi.fn().mockResolvedValue('board_1') }))
vi.mock('@/lib/pinterest/destination', () => ({
  resolvePinterestDestinationUrl: vi.fn().mockReturnValue('https://example.com/guide'),
  tagPinterestDestination: vi.fn().mockResolvedValue('https://example.com/guide?utm_source=pinterest'),
}))
// Strict-only deps — mocked defensively though the tests run lightweight.
vi.mock('@/lib/pinterest/image', () => ({ resolvePinterestImage: vi.fn() }))
vi.mock('@/lib/pinterest/media', () => ({ assertImageFetchable: vi.fn() }))
vi.mock('@/lib/pinterest/credential', () => ({ getValidPinterestToken: vi.fn() }))

import { validatePinterestReadiness } from '@/lib/pinterest/readiness'

function makeOutput(opts: {
  title?: string | null
  body?: string
  pinterest?: Partial<PinterestPlatformContent>
  withImage?: boolean
}): Output {
  return {
    id: 'o_1',
    workspaceId: 'ws_1',
    channelId: 'ch_1',
    title: opts.title ?? null,
    content: {
      body: opts.body ?? '',
      ...(opts.withImage ? { selectedVisualAssetId: 'asset_1' } : {}),
      ...(opts.pinterest ? { platforms: { pinterest: opts.pinterest } } : {}),
    },
  } as unknown as Output
}

const run = (o: Output) => validatePinterestReadiness(o, { mode: 'lightweight' })
const codes = (arr: Array<{ code: string }>) => arr.map((e) => e.code)

beforeEach(() => { gate.pinterest = true })

describe('blockers', () => {
  it('blocks when title is missing (no platform title, no output.title)', async () => {
    const r = await run(makeOutput({ body: 'desc', withImage: true }))
    expect(r.ok).toBe(false)
    expect(codes(r.errors)).toContain('missing_title')
  })

  it('blocks when description is missing', async () => {
    const r = await run(makeOutput({ title: 'A title', withImage: true }))
    expect(r.ok).toBe(false)
    expect(codes(r.errors)).toContain('missing_description')
  })

  it('is ok with resolvable title + description + image + board + destination', async () => {
    const r = await run(makeOutput({
      withImage: true,
      pinterest: {
        title: 'Small bedroom layout ideas',
        description: 'Explore small bedroom layout ideas for apartments.',
        altText: 'A small apartment bedroom with shelves.',
        keywords: ['small bedroom ideas'],
        visualText: 'Small bedroom ideas',
      },
    }))
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })
})

describe('warnings (never affect ok)', () => {
  const full = (over: Partial<PinterestPlatformContent>) => makeOutput({
    withImage: true,
    pinterest: {
      title: 'Small bedroom layout ideas',
      description: 'Explore small bedroom layout ideas for apartments.',
      altText: 'A small apartment bedroom with shelves.',
      keywords: ['small bedroom ideas'],
      visualText: 'Small bedroom ideas',
      ...over,
    },
  })

  it('warns on missing alt text / keywords / visual text without blocking', async () => {
    const r = await run(full({ altText: undefined, keywords: [], visualText: undefined }))
    expect(r.ok).toBe(true)
    expect(codes(r.warnings)).toEqual(
      expect.arrayContaining(['missing_alt_text', 'missing_keywords', 'missing_visual_text']),
    )
  })

  it('warns visual_text_too_long above 8 words but stays ok', async () => {
    const r = await run(full({ visualText: 'one two three four five six seven eight nine ten' }))
    expect(r.ok).toBe(true)
    expect(codes(r.warnings)).toContain('visual_text_too_long')
  })

  it('fires generic_title only when falling back to the generic title', async () => {
    const r = await run(makeOutput({
      title: 'Generic post title',
      withImage: true,
      pinterest: { description: 'A real Pinterest description here.' },
    }))
    expect(codes(r.warnings)).toContain('generic_title')
  })

  it('does NOT fire generic_title when a platform title equals the generic one', async () => {
    const r = await run(makeOutput({
      title: 'Same title',
      withImage: true,
      pinterest: { title: 'Same title', description: 'A real Pinterest description here.' },
    }))
    expect(codes(r.warnings)).not.toContain('generic_title')
  })

  it('fires generic_description only when falling back to the body', async () => {
    const r = await run(makeOutput({
      body: 'Generic body text',
      withImage: true,
      pinterest: { title: 'A real Pinterest title' },
    }))
    expect(codes(r.warnings)).toContain('generic_description')
  })
})

describe('feature gate', () => {
  it('returns a warnings array even on early disabled return', async () => {
    gate.pinterest = false
    const r = await run(makeOutput({ title: 't', body: 'b', withImage: true }))
    expect(r.ok).toBe(false)
    expect(codes(r.errors)).toEqual(['pinterest_disabled'])
    expect(r.warnings).toEqual([])
  })
})
