import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Output } from '@/types/domain'

// Spy on the bridge so we can assert routing without touching the database/executor.
const publishSubstackOutput = vi.hoisted(() => vi.fn())
vi.mock('@/lib/domain/substack-publish', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/domain/substack-publish')>()
  return { ...actual, publishSubstackOutput }
})

import { publishOutput } from '@/lib/domain/publishing'
import { SubstackManualFallbackError } from '@/lib/domain/substack-publish'

function makeOutput(overrides: Partial<Output>): Output {
  return {
    id: 'out_1',
    workspaceId: 'ws_1',
    channelId: null,
    publishingConnectionId: null,
    publishIntent: null,
    contentType: null,
    providerPostId: null,
    providerPostUrl: null,
    content: { body: 'hi' },
    title: 'T',
    ...overrides,
  } as unknown as Output
}

beforeEach(() => {
  publishSubstackOutput.mockReset().mockResolvedValue({ postUrn: 'p1', postUrl: 'https://x' })
})

describe('publishOutput — Substack routing', () => {
  it('routes to the bridge when a publishing connection is present', async () => {
    const out = makeOutput({ publishingConnectionId: 'conn_1', contentType: 'substack-newsletter' })
    const res = await publishOutput(out)
    expect(publishSubstackOutput).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ postUrn: 'p1', postUrl: 'https://x' })
  })

  it('CORE SAFETY: substack content type with no connection never publishes', async () => {
    const out = makeOutput({ publishingConnectionId: null, contentType: 'substack-newsletter' })
    await expect(publishOutput(out)).rejects.toBeInstanceOf(SubstackManualFallbackError)
    expect(publishSubstackOutput).not.toHaveBeenCalled()
  })

  it('returns the stored provider data when already published (idempotent)', async () => {
    const out = makeOutput({ providerPostId: 'urn_existing', providerPostUrl: 'https://existing', publishingConnectionId: 'conn_1' })
    const res = await publishOutput(out)
    expect(res).toEqual({ postUrn: 'urn_existing', postUrl: 'https://existing' })
    expect(publishSubstackOutput).not.toHaveBeenCalled()
  })
})
