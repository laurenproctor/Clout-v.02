import { describe, it, expect, beforeAll } from 'vitest'
import { signConnectorToken, verifyConnectorToken } from '@/lib/unipile/link-token'

beforeAll(() => {
  process.env.OAUTH_STATE_SECRET = 'test-secret-for-connector-tokens'
})

describe('connector link token', () => {
  const payload = { workspaceId: 'ws-42', userId: 'user-7' }

  it('round-trips a signed payload', () => {
    const token = signConnectorToken(payload)
    expect(verifyConnectorToken(token)).toEqual(payload)
  })

  it('rejects a tampered payload', () => {
    const token = signConnectorToken(payload)
    const [data, sig] = token.split('.')
    const forged = `${data}x.${sig}`
    expect(() => verifyConnectorToken(forged)).toThrow()
  })

  it('rejects a token signed with a different secret', () => {
    const token = signConnectorToken(payload)
    process.env.OAUTH_STATE_SECRET = 'a-different-secret'
    expect(() => verifyConnectorToken(token)).toThrow(/signature/)
    process.env.OAUTH_STATE_SECRET = 'test-secret-for-connector-tokens'
  })

  it('rejects a malformed token', () => {
    expect(() => verifyConnectorToken('not-a-token')).toThrow()
  })
})
