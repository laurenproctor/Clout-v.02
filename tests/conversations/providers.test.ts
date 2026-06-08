import { describe, it, expect } from 'vitest'
import { SubstackProvider } from '@/lib/conversations/providers/substack'
import { RSSProvider } from '@/lib/conversations/providers/rss'
import { GenericArticleProvider } from '@/lib/conversations/providers/generic'
import { getProvider } from '@/lib/conversations/providers'

describe('SubstackProvider.canHandle', () => {
  const p = new SubstackProvider()
  it('matches *.substack.com', () => expect(p.canHandle('https://foo.substack.com')).toBe(true))
  it('rejects non-substack', () => expect(p.canHandle('https://example.com')).toBe(false))
})

describe('RSSProvider.canHandle', () => {
  const p = new RSSProvider()
  it('matches feed.xml', () => expect(p.canHandle('https://example.com/feed.xml')).toBe(true))
  it('matches /feed', () => expect(p.canHandle('https://example.com/feed')).toBe(true))
  it('matches /rss', () => expect(p.canHandle('https://example.com/rss')).toBe(true))
  it('matches atom.xml', () => expect(p.canHandle('https://example.com/atom.xml')).toBe(true))
  it('rejects plain blog URL', () => expect(p.canHandle('https://example.com/blog')).toBe(false))
})

describe('getProvider', () => {
  it('SubstackProvider for substack URLs', () => expect(getProvider('https://foo.substack.com') instanceof SubstackProvider).toBe(true))
  it('RSSProvider for feed URLs', () => expect(getProvider('https://example.com/feed.xml') instanceof RSSProvider).toBe(true))
  it('falls back to GenericArticleProvider', () => expect(getProvider('https://example.com') instanceof GenericArticleProvider).toBe(true))
})
