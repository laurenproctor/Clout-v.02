import { describe, it, expect } from 'vitest'
import { escapeRegex, matchesBlockedKeyword, buildSearchableText } from '@/lib/conversations/utils'

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegex('C++')).toBe('C\\+\\+')
    expect(escapeRegex('price (USD)')).toBe('price \\(USD\\)')
    expect(escapeRegex('a.b')).toBe('a\\.b')
  })

  it('leaves plain strings unchanged', () => {
    expect(escapeRegex('hello world')).toBe('hello world')
  })
})

describe('matchesBlockedKeyword', () => {
  it('returns false for empty keywords array', () => {
    expect(matchesBlockedKeyword('AI is transforming healthcare', [])).toBe(false)
  })

  it('matches an exact keyword', () => {
    expect(matchesBlockedKeyword('AI is transforming healthcare', ['AI'])).toBe(true)
  })

  it('does not match keyword inside a longer word (word boundary)', () => {
    // "AI" should not match "paid" or "chair"
    expect(matchesBlockedKeyword('I got paid to sit in a chair', ['AI'])).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(matchesBlockedKeyword('The crypto market is volatile', ['Crypto'])).toBe(true)
    expect(matchesBlockedKeyword('THE CRYPTO MARKET', ['crypto'])).toBe(true)
  })

  it('matches when keyword is at start of text', () => {
    expect(matchesBlockedKeyword('Blockchain technology is evolving', ['Blockchain'])).toBe(true)
  })

  it('matches when keyword is at end of text', () => {
    expect(matchesBlockedKeyword('The future of blockchain', ['blockchain'])).toBe(true)
  })

  it('matches any keyword in the array (OR logic)', () => {
    expect(matchesBlockedKeyword('NFT sales decline', ['NFT', 'crypto'])).toBe(true)
    expect(matchesBlockedKeyword('crypto crash continues', ['NFT', 'crypto'])).toBe(true)
    expect(matchesBlockedKeyword('stocks rally today', ['NFT', 'crypto'])).toBe(false)
  })

  it('handles keywords with special regex characters safely', () => {
    expect(matchesBlockedKeyword('C++ is a language', ['C++'])).toBe(true)
    expect(matchesBlockedKeyword('price (USD) rising', ['price (USD)'])).toBe(true)
  })

  it('does not match partial word overlap', () => {
    // "SaaS" should not match "SaaSy" or "MySaaS"
    expect(matchesBlockedKeyword('The SaaSy founder', ['SaaS'])).toBe(false)
    expect(matchesBlockedKeyword('Visit MySaaS today', ['SaaS'])).toBe(false)
    expect(matchesBlockedKeyword('SaaS pricing strategies', ['SaaS'])).toBe(true)
  })
})

describe('buildSearchableText', () => {
  it('joins non-null fields with spaces', () => {
    expect(buildSearchableText(['title', 'excerpt', 'summary'])).toBe('title excerpt summary')
  })

  it('filters out null and undefined', () => {
    expect(buildSearchableText(['title', null, undefined, 'summary'])).toBe('title summary')
  })

  it('returns empty string for all-null input', () => {
    expect(buildSearchableText([null, undefined])).toBe('')
  })
})
