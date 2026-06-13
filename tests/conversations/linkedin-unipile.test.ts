import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the connector dependencies so the provider can be exercised without DB/network.
vi.mock('@/lib/unipile/gates', () => ({ evaluateUnipileMonitoring: vi.fn() }))
vi.mock('@/lib/unipile/connection', () => ({ getUnipileConnection: vi.fn() }))
vi.mock('@/lib/unipile/client', () => ({ searchPosts: vi.fn() }))

import { LinkedInUnipileProvider } from '@/lib/conversations/providers/linkedin-unipile'
import { LinkedInProvider } from '@/lib/conversations/providers/linkedin'
import { getProvider } from '@/lib/conversations/providers'
import { evaluateUnipileMonitoring } from '@/lib/unipile/gates'
import { getUnipileConnection } from '@/lib/unipile/connection'
import { searchPosts } from '@/lib/unipile/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = (fn: unknown) => fn as any

const samplePost = {
  id: 'p1',
  social_id: 'urn:li:activity:123',
  share_url: 'https://www.linkedin.com/posts/jane-doe-foo',
  text: 'Hot take on SaaS pricing\nSecond paragraph with detail.',
  author: { name: 'Jane Doe', headline: 'Founder @ Acme', public_identifier: 'janedoe' },
  reaction_counter: 10,
  comment_counter: 4,
  parsed_datetime: '2026-06-10T00:00:00Z',
}

function connect() {
  mock(evaluateUnipileMonitoring).mockResolvedValue({ allowed: true })
  mock(getUnipileConnection).mockResolvedValue({
    accountId: 'acc1', status: 'connected', provider: 'linkedin', connectedAt: '2026-06-01T00:00:00Z',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LinkedInUnipileProvider.canHandle', () => {
  const p = new LinkedInUnipileProvider()
  it('matches linkedin://search virtual URLs', () => {
    expect(p.canHandle('linkedin://search?q=founder%20marketing')).toBe(true)
  })
  it('rejects ordinary LinkedIn URLs', () => {
    expect(p.canHandle('https://www.linkedin.com/in/janedoe')).toBe(false)
  })
})

describe('keyword provider routing (no Jina for keyword monitoring)', () => {
  it('routes keyword:linkedin to LinkedInUnipileProvider, not the Jina provider', () => {
    const provider = getProvider('', 'keyword', 'linkedin')
    expect(provider).toBeInstanceOf(LinkedInUnipileProvider)
    expect(provider).not.toBeInstanceOf(LinkedInProvider)
  })
  it('throws for unsupported keyword providers', () => {
    expect(() => getProvider('', 'keyword', 'nope')).toThrow(/Unsupported keyword provider/)
  })
})

describe('LinkedInUnipileProvider.fetch mapping', () => {
  it('maps Unipile posts to NormalizedItem with provider identity fields', async () => {
    connect()
    mock(searchPosts).mockResolvedValue([samplePost])

    const items = await new LinkedInUnipileProvider().fetch('linkedin://search?q=saas', { workspaceId: 'ws1' })

    expect(items).toHaveLength(1)
    const it0 = items[0]
    expect(it0.provider).toBe('linkedin')
    expect(it0.providerSocialId).toBe('urn:li:activity:123')
    expect(it0.providerItemId).toBe('p1')
    expect(it0.providerUrl).toBe('https://www.linkedin.com/posts/jane-doe-foo')
    expect(it0.externalId).toBe('urn:li:activity:123')
    expect(it0.author).toBe('Jane Doe')
    expect(it0.authorUrl).toBe('https://www.linkedin.com/in/janedoe')
    expect(it0.publishedAt).toBe('2026-06-10T00:00:00Z')
    expect(it0.title).toBe('Hot take on SaaS pricing')
    expect(it0.metadata.reactionCount).toBe(10)
    expect(it0.metadata.commentCount).toBe(4)
    expect(it0.metadata.engagementScore).toBe(10 + 4 * 3)
  })

  it('filters out posts below the engagement threshold', async () => {
    connect()
    mock(searchPosts).mockResolvedValue([
      { ...samplePost, id: 'low', social_id: 'urn:li:activity:low', reaction_counter: 0, comment_counter: 1 },
      samplePost,
    ])
    const items = await new LinkedInUnipileProvider().fetch('linkedin://search?q=saas', { workspaceId: 'ws1' })
    expect(items.map(i => i.providerSocialId)).toEqual(['urn:li:activity:123'])
  })

  it('caps the number of items per run', async () => {
    connect()
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...samplePost, id: `p${i}`, social_id: `urn:li:activity:${i}`,
    }))
    mock(searchPosts).mockResolvedValue(many)
    const items = await new LinkedInUnipileProvider().fetch('linkedin://search?q=saas', { workspaceId: 'ws1' })
    expect(items.length).toBeLessThanOrEqual(25)
  })

  it('returns empty when the keyword is missing', async () => {
    connect()
    const items = await new LinkedInUnipileProvider().fetch('linkedin://search', { workspaceId: 'ws1' })
    expect(items).toEqual([])
    expect(searchPosts).not.toHaveBeenCalled()
  })
})

describe('LinkedInUnipileProvider.fetch gating', () => {
  it('throws (setup-required) when the monitoring gate denies', async () => {
    mock(evaluateUnipileMonitoring).mockResolvedValue({
      allowed: false, reason: 'not_connected', message: 'Connect the connector first.',
    })
    await expect(
      new LinkedInUnipileProvider().fetch('linkedin://search?q=saas', { workspaceId: 'ws1' }),
    ).rejects.toThrow(/not_connected/)
    expect(searchPosts).not.toHaveBeenCalled()
  })

  it('throws when no workspace context is provided', async () => {
    await expect(
      new LinkedInUnipileProvider().fetch('linkedin://search?q=saas'),
    ).rejects.toThrow(/workspace/)
  })
})
