import { describe, it, expect } from 'vitest'
import { isSafeUrl } from '@/lib/scraper/isSafeUrl'

describe('isSafeUrl', () => {
  it('accepts a valid public HTTPS URL', () => {
    expect(isSafeUrl('https://example.com/article')).toBe(true)
  })

  it('rejects HTTP (non-HTTPS)', () => {
    expect(isSafeUrl('http://example.com/article')).toBe(false)
  })

  it('rejects a malformed URL', () => {
    expect(isSafeUrl('not-a-url')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isSafeUrl('')).toBe(false)
  })

  it('rejects localhost', () => {
    expect(isSafeUrl('https://localhost/admin')).toBe(false)
  })

  it('rejects 127.0.0.1', () => {
    expect(isSafeUrl('https://127.0.0.1/secret')).toBe(false)
  })

  it('rejects other loopback addresses (127.0.0.2)', () => {
    expect(isSafeUrl('https://127.0.0.2/secret')).toBe(false)
  })

  it('rejects IPv6 loopback ::1', () => {
    expect(isSafeUrl('https://[::1]/secret')).toBe(false)
  })

  it('rejects IPv6-mapped IPv4 for private range', () => {
    expect(isSafeUrl('https://[::ffff:192.168.1.1]/secret')).toBe(false)
  })

  it('rejects IPv6-mapped IPv4 for loopback', () => {
    expect(isSafeUrl('https://[::ffff:127.0.0.1]/secret')).toBe(false)
  })

  it('rejects 10.x.x.x private range', () => {
    expect(isSafeUrl('https://10.0.0.1/internal')).toBe(false)
  })

  it('rejects 192.168.x.x private range', () => {
    expect(isSafeUrl('https://192.168.1.1/internal')).toBe(false)
  })

  it('rejects 172.16.x.x private range', () => {
    expect(isSafeUrl('https://172.16.0.1/internal')).toBe(false)
  })

  it('rejects 172.31.x.x private range', () => {
    expect(isSafeUrl('https://172.31.255.255/internal')).toBe(false)
  })

  it('accepts 172.32.x.x (outside private range)', () => {
    expect(isSafeUrl('https://172.32.0.1/page')).toBe(true)
  })

  it('rejects AWS/GCP/Azure IMDS endpoint', () => {
    expect(isSafeUrl('https://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects 0.0.0.0', () => {
    expect(isSafeUrl('https://0.0.0.0/admin')).toBe(false)
  })

  it('rejects full link-local range (169.254.x.x)', () => {
    expect(isSafeUrl('https://169.254.1.1/metadata')).toBe(false)
  })

  it('rejects GCP metadata endpoint', () => {
    expect(isSafeUrl('https://metadata.google.internal/computeMetadata/v1/')).toBe(false)
  })
})
