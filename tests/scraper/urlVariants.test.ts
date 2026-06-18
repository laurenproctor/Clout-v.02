import { describe, it, expect } from 'vitest'
import { urlVariants } from '@/lib/scraper/fetchUrl'

describe('urlVariants', () => {
  it('puts the original URL first', () => {
    expect(urlVariants('https://example.com/')[0]).toBe('https://example.com/')
  })

  it('toggles apex → www on the same scheme before switching scheme', () => {
    const variants = urlVariants('https://example.com/')
    expect(variants).toContain('https://www.example.com/')
    // www toggle on the working scheme should come before the http fallback
    expect(variants.indexOf('https://www.example.com/')).toBeLessThan(
      variants.indexOf('http://example.com/'),
    )
  })

  it('toggles www → apex', () => {
    expect(urlVariants('https://www.example.com/')).toContain('https://example.com/')
  })

  it('includes the other scheme', () => {
    expect(urlVariants('https://example.com/')).toContain('http://example.com/')
  })

  it('preserves the path across variants', () => {
    const variants = urlVariants('https://example.com/blog/post')
    expect(variants).toContain('https://www.example.com/blog/post')
  })

  it('is deduped and capped at 4', () => {
    const variants = urlVariants('https://example.com/')
    expect(new Set(variants).size).toBe(variants.length)
    expect(variants.length).toBeLessThanOrEqual(4)
  })

  it('returns the raw string for a malformed URL', () => {
    expect(urlVariants('not a url')).toEqual(['not a url'])
  })
})
