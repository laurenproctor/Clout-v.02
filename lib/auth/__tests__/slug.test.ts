import { describe, it, expect } from 'vitest'

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,47}$/.test(slug)
}

describe('slug validation', () => {
  it('accepts lowercase alphanumeric', () => {
    expect(isValidSlug('amlon')).toBe(true)
    expect(isValidSlug('amlon-group')).toBe(true)
    expect(isValidSlug('amlon123')).toBe(true)
  })

  it('rejects uppercase', () => {
    expect(isValidSlug('Amlon')).toBe(false)
  })

  it('rejects leading hyphen', () => {
    expect(isValidSlug('-amlon')).toBe(false)
  })

  it('accepts single char', () => {
    expect(isValidSlug('a')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidSlug('')).toBe(false)
  })

  it('rejects special characters', () => {
    expect(isValidSlug('amlon_group')).toBe(false)
    expect(isValidSlug('amlon.group')).toBe(false)
  })
})
