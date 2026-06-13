import { describe, it, expect } from 'vitest'
import { normalizeHashtags } from '@/lib/linkedin/runGeneration'

describe('normalizeHashtags', () => {
  it('returns exactly 5 when given fewer (length 3)', () => {
    const result = normalizeHashtags(['leadership', 'strategy', 'growth'])
    expect(result).toHaveLength(5)
    // original tags preserved at the front
    expect(result.slice(0, 3)).toEqual(['leadership', 'strategy', 'growth'])
  })

  it('returns exactly 5 when given an empty list', () => {
    const result = normalizeHashtags([])
    expect(result).toHaveLength(5)
  })

  it('caps at 5 when given more (length 7)', () => {
    const result = normalizeHashtags(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(result).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('leaves an exact-5 list unchanged', () => {
    const input = ['one', 'two', 'three', 'four', 'five']
    expect(normalizeHashtags(input)).toEqual(input)
  })

  it('strips leading # and trims whitespace', () => {
    const result = normalizeHashtags(['#leadership', '  strategy  ', '#growth'])
    expect(result.slice(0, 3)).toEqual(['leadership', 'strategy', 'growth'])
  })

  it('drops blanks before counting', () => {
    const result = normalizeHashtags(['leadership', '', '   ', '#'])
    expect(result).toHaveLength(5)
    expect(result[0]).toBe('leadership')
    expect(result).not.toContain('')
  })

  it('de-duplicates case-insensitively', () => {
    const result = normalizeHashtags(['Leadership', 'leadership', 'LEADERSHIP'])
    // only one "leadership" survives, then backfilled to 5
    const lower = result.map((t) => t.toLowerCase())
    expect(new Set(lower).size).toBe(result.length)
    expect(result).toHaveLength(5)
  })

  it('produces no duplicates after backfilling', () => {
    const result = normalizeHashtags(['leadership'])
    const lower = result.map((t) => t.toLowerCase())
    expect(new Set(lower).size).toBe(5)
  })

  it('backfill entries do not collide with existing tags', () => {
    // seed with a tag that also lives in the fallback pool — must not be duplicated
    const result = normalizeHashtags(['growth'])
    const lower = result.map((t) => t.toLowerCase())
    expect(new Set(lower).size).toBe(5)
    expect(lower.filter((t) => t === 'growth')).toHaveLength(1)
  })
})
