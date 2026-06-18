import { describe, it, expect } from 'vitest'
import { formatUTMDate } from '@/lib/distribution/platform-registry'

// Fixed local date: 7 June 2026 (month index 5 = June)
const DATE = new Date(2026, 5, 7)

describe('formatUTMDate', () => {
  it('formats yyyy-mm-dd', () => {
    expect(formatUTMDate('yyyy-mm-dd', DATE)).toBe('2026-06-07')
  })

  it('formats yyyy-mm', () => {
    expect(formatUTMDate('yyyy-mm', DATE)).toBe('2026-06')
  })

  it('formats yyyymmdd', () => {
    expect(formatUTMDate('yyyymmdd', DATE)).toBe('20260607')
  })

  it('formats yyyy', () => {
    expect(formatUTMDate('yyyy', DATE)).toBe('2026')
  })

  it('formats mmm-yyyy as lowercase month abbreviation', () => {
    expect(formatUTMDate('mmm-yyyy', DATE)).toBe('jun-2026')
  })

  it('zero-pads single-digit months and days', () => {
    expect(formatUTMDate('yyyy-mm-dd', new Date(2026, 0, 3))).toBe('2026-01-03')
  })

  it('produces valid UTM values (lowercase alphanumeric with hyphens) for every format', () => {
    const formats = ['yyyy-mm-dd', 'yyyy-mm', 'yyyymmdd', 'yyyy', 'mmm-yyyy'] as const
    for (const fmt of formats) {
      expect(formatUTMDate(fmt, DATE)).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
