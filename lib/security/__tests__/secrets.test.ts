import { describe, it, expect } from 'vitest'
import { encryptWorkspaceSecret, decryptWorkspaceSecret } from '../secrets'

process.env.WORKSPACE_SECRETS_KEY = 'aa'.repeat(32) // 64 hex chars = 32 bytes

describe('secrets', () => {
  it('round-trips plaintext correctly', () => {
    const plain  = '{"keyId":"ABC","issuerId":"xyz","privateKey":"-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----"}'
    const cipher = encryptWorkspaceSecret(plain)
    expect(cipher).not.toBe(plain)
    expect(cipher.split('.').length).toBe(3)
    expect(decryptWorkspaceSecret(cipher)).toBe(plain)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const c1 = encryptWorkspaceSecret('same')
    const c2 = encryptWorkspaceSecret('same')
    expect(c1).not.toBe(c2)
    expect(decryptWorkspaceSecret(c1)).toBe('same')
    expect(decryptWorkspaceSecret(c2)).toBe('same')
  })

  it('throws on tampered ciphertext', () => {
    const cipher  = encryptWorkspaceSecret('hello')
    const parts = cipher.split('.')
    const tampered = [parts[0], parts[1], 'ffffffffffffffffffffffffffffffff'].join('.')
    expect(() => decryptWorkspaceSecret(tampered)).toThrow()
  })
})
