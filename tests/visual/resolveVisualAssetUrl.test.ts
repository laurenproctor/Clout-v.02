// tests/visual/resolveVisualAssetUrl.test.ts
// Unit tests for the shared publish-time visual asset URL resolver.
// The resolver must prefer the canonical storage_path (regenerated public URL) and
// fall back to original_url — mirroring the durable resolution Pinterest relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the Supabase service client ──────────────────────────────────────────
// resolveVisualAssetUrl calls createServiceClient(), then:
//   .from('visual_assets').select(...).eq('id', id).single()  -> { data }
//   .storage.from('visual-assets').getPublicUrl(path)          -> { data: { publicUrl } }
let singleResult: { data: unknown } = { data: null }
const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `https://supabase.test/storage/v1/object/public/visual-assets/${path}` },
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(singleResult),
        }),
      }),
    }),
    storage: {
      from: () => ({ getPublicUrl }),
    },
  }),
}))

import { resolveVisualAssetUrl } from '@/lib/visual/storage/resolveVisualAssetUrl'

beforeEach(() => {
  singleResult = { data: null }
  getPublicUrl.mockClear()
})

describe('resolveVisualAssetUrl', () => {
  it('returns null for an empty asset id without querying', async () => {
    expect(await resolveVisualAssetUrl('')).toBeNull()
    expect(getPublicUrl).not.toHaveBeenCalled()
  })

  it('returns null when no asset row is found', async () => {
    singleResult = { data: null }
    expect(await resolveVisualAssetUrl('missing-id')).toBeNull()
  })

  it('resolves storage_path to a public bucket URL (preferred over original_url)', async () => {
    singleResult = {
      data: {
        storage_path: 'ws-1/composed/asset-1.png',
        original_url: 'https://stale.example/old.png',
        description: 'A nice card',
        name: 'Card 1',
      },
    }
    const result = await resolveVisualAssetUrl('asset-1')
    expect(getPublicUrl).toHaveBeenCalledWith('ws-1/composed/asset-1.png')
    expect(result).toEqual({
      url: 'https://supabase.test/storage/v1/object/public/visual-assets/ws-1/composed/asset-1.png',
      altText: 'A nice card',
      name: 'Card 1',
      storagePath: 'ws-1/composed/asset-1.png',
    })
  })

  it('falls back to original_url when storage_path is empty (legacy asset)', async () => {
    singleResult = {
      data: {
        storage_path: '',
        original_url: 'https://supabase.test/legacy/public.png',
        description: null,
        name: null,
      },
    }
    const result = await resolveVisualAssetUrl('legacy-asset')
    expect(getPublicUrl).not.toHaveBeenCalled()
    expect(result?.url).toBe('https://supabase.test/legacy/public.png')
    expect(result?.altText).toBeNull()
  })

  it('returns null when neither storage_path nor original_url yields a URL', async () => {
    singleResult = { data: { storage_path: null, original_url: null, description: null, name: null } }
    expect(await resolveVisualAssetUrl('empty-asset')).toBeNull()
  })

  it('prefers description over name for alt text, falling back to name', async () => {
    singleResult = {
      data: { storage_path: 'ws/asset.png', original_url: null, description: null, name: 'Fallback Name' },
    }
    const result = await resolveVisualAssetUrl('asset-2')
    expect(result?.altText).toBe('Fallback Name')
  })
})
