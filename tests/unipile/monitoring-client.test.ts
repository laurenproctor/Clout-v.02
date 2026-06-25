import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Structural guard (stronger than the token scan): the Phase-3 provider depends only on
// the read-only LinkedInMonitoringClient surface, so it cannot reach any Unipile mutation
// method. These tests assert the surface shape, the absence of comment-fetch coupling,
// and that an injected monitoring-only stub satisfies the provider's fetch().

vi.mock('@/lib/unipile/gates', () => ({ evaluateUnipileMonitoring: vi.fn() }))
vi.mock('@/lib/unipile/connection', () => ({ getUnipileConnection: vi.fn() }))

import { linkedinMonitoringClient, type LinkedInMonitoringClient } from '@/lib/unipile/monitoring-client'
import { LinkedInUnipileProvider } from '@/lib/conversations/providers/linkedin-unipile'
import { evaluateUnipileMonitoring } from '@/lib/unipile/gates'
import { getUnipileConnection } from '@/lib/unipile/connection'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = (fn: unknown) => fn as any

const samplePost = {
  id: 'p1',
  social_id: 'urn:li:activity:123',
  share_url: 'https://www.linkedin.com/posts/jane-doe-foo',
  text: 'Hot take on SaaS pricing',
  author: { name: 'Jane Doe', headline: 'Founder', public_identifier: 'janedoe' },
  reaction_counter: 10,
  comment_counter: 4,
  parsed_datetime: '2026-06-10T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mock(evaluateUnipileMonitoring).mockResolvedValue({ allowed: true })
  mock(getUnipileConnection).mockResolvedValue({
    accountId: 'acc1', provider: 'linkedin', status: 'connected', connectedAt: '2026-06-01T00:00:00Z',
  })
})

describe('LinkedInMonitoringClient surface', () => {
  it('exposes searchPosts ONLY (no mutation / comment-fetch methods)', () => {
    expect(Object.keys(linkedinMonitoringClient)).toEqual(['searchPosts'])
    expect(typeof linkedinMonitoringClient.searchPosts).toBe('function')
  })
})

describe('provider does not couple to comment fetching', () => {
  it('linkedin-unipile.ts does not import or call listPostComments', () => {
    // Scoped to the changed Phase-3 provider file (not the client module, which may keep
    // listPostComments typed for future phases — grepping the client would be a false positive).
    const src = readFileSync(
      resolve(process.cwd(), 'lib/conversations/providers/linkedin-unipile.ts'),
      'utf8',
    )
    expect(src.includes('listPostComments')).toBe(false)
  })
})

describe('provider fetch uses the injected monitoring client only', () => {
  it('invokes only searchPosts and maps results', async () => {
    const searchPosts = vi.fn().mockResolvedValue([samplePost])
    const stub: LinkedInMonitoringClient = { searchPosts }

    const items = await new LinkedInUnipileProvider(stub).fetch('linkedin://search?q=saas', { workspaceId: 'ws1' })

    expect(searchPosts).toHaveBeenCalledTimes(1)
    expect(searchPosts).toHaveBeenCalledWith('acc1', 'saas', expect.objectContaining({ datePosted: expect.any(String) }))
    expect(items).toHaveLength(1)
    expect(items[0].providerSocialId).toBe('urn:li:activity:123')
    // The stub exposes no other method — a mutation call would be a compile-time error.
    expect(Object.keys(stub)).toEqual(['searchPosts'])
  })
})
