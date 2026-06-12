import { describe, it, expect } from 'vitest'
import { isWithinLimit, windowStartIso, UNIPILE_LIMITS } from '@/lib/unipile/ratelimit'

describe('isWithinLimit', () => {
  const window = { max: 3, windowMs: 1000 }

  it('allows counts below the max', () => {
    expect(isWithinLimit(0, window)).toBe(true)
    expect(isWithinLimit(2, window)).toBe(true)
  })

  it('blocks at and above the max', () => {
    expect(isWithinLimit(3, window)).toBe(false)
    expect(isWithinLimit(4, window)).toBe(false)
  })
})

describe('windowStartIso', () => {
  it('returns the ISO timestamp one window before now', () => {
    const now = 1_000_000_000_000
    expect(windowStartIso({ max: 1, windowMs: 60_000 }, now))
      .toBe(new Date(now - 60_000).toISOString())
  })
})

describe('UNIPILE_LIMITS', () => {
  it('keeps conservative defaults', () => {
    expect(UNIPILE_LIMITS.engagementPerAccount.max).toBeLessThanOrEqual(50)
    expect(UNIPILE_LIMITS.maxItemsPerRun).toBeLessThanOrEqual(50)
  })
})
