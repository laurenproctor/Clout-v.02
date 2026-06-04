import { describe, it, expect } from 'vitest'
import { toTitleCase } from '@/lib/audiences'

describe('toTitleCase', () => {
  it('capitalizes first letter of each word', () => {
    expect(toTitleCase('b2b saas founders')).toBe('B2b Saas Founders')
  })

  it('leaves already-capitalized words unchanged', () => {
    expect(toTitleCase('Enterprise Buyers')).toBe('Enterprise Buyers')
  })

  it('handles mixed case input', () => {
    expect(toTitleCase('DTC founders scaling past $1M')).toBe('DTC Founders Scaling Past $1M')
  })

  it('trims leading and trailing whitespace', () => {
    expect(toTitleCase('  early stage founders  ')).toBe('Early Stage Founders')
  })

  it('handles single word', () => {
    expect(toTitleCase('recruiters')).toBe('Recruiters')
  })
})
