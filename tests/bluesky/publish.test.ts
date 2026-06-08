import { describe, it, expect } from 'vitest'
import { formatBlueSkyText, postToBlueSky, buildBlueSkyPostUrl } from '@/lib/bluesky/publish'
import type { OutputContent } from '@/types/domain'

function makeContent(body: string | null): OutputContent {
  return { body, hashtags: [], keyPoints: [] } as unknown as OutputContent
}

describe('formatBlueSkyText', () => {
  it('returns trimmed body', () => {
    expect(formatBlueSkyText(makeContent('  hello world  '))).toBe('hello world')
  })

  it('returns empty string for null body', () => {
    expect(formatBlueSkyText(makeContent(null))).toBe('')
  })

  it('does not append hashtags', () => {
    const content = { body: 'test post', hashtags: ['foo', 'bar'] } as unknown as OutputContent
    expect(formatBlueSkyText(content)).toBe('test post')
  })
})

describe('buildBlueSkyPostUrl', () => {
  it('converts an AT URI to a bsky.app URL', () => {
    const uri = 'at://did:plc:abc123/app.bsky.feed.post/xyz789'
    expect(buildBlueSkyPostUrl(uri)).toBe('https://bsky.app/profile/did:plc:abc123/post/xyz789')
  })
})

describe('postToBlueSky — content_too_long validation', () => {
  it('throws content_too_long before any network call when text exceeds 300 chars', async () => {
    const longBody = 'x'.repeat(301)
    await expect(
      postToBlueSky('did:plc:test', makeContent(longBody))
    ).rejects.toMatchObject({ code: 'content_too_long' })
  })

  it('throws content_too_long with character count in message', async () => {
    const longBody = 'x'.repeat(305)
    await expect(
      postToBlueSky('did:plc:test', makeContent(longBody))
    ).rejects.toThrow('305 chars')
  })
})
