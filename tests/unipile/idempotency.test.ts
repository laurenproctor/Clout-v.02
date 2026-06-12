import { describe, it, expect } from 'vitest'
import { engagementIdempotencyKey } from '@/lib/unipile/idempotency'

const base = {
  workspaceId: 'ws-1',
  providerSocialId: 'urn:li:activity:123',
  actionType: 'comment' as const,
  approvedText: 'Great point — here is a counterexample.',
}

describe('engagementIdempotencyKey', () => {
  it('is deterministic for identical inputs', () => {
    expect(engagementIdempotencyKey(base)).toBe(engagementIdempotencyKey(base))
  })

  it('is a 32-char hex string', () => {
    expect(engagementIdempotencyKey(base)).toMatch(/^[0-9a-f]{32}$/)
  })

  it('differs when the approved text is edited (re-approval = new action)', () => {
    expect(engagementIdempotencyKey(base))
      .not.toBe(engagementIdempotencyKey({ ...base, approvedText: 'Edited reply.' }))
  })

  it('differs across target posts and action types', () => {
    expect(engagementIdempotencyKey(base))
      .not.toBe(engagementIdempotencyKey({ ...base, providerSocialId: 'urn:li:activity:999' }))
    expect(engagementIdempotencyKey(base))
      .not.toBe(engagementIdempotencyKey({ ...base, actionType: 'reaction', approvedText: null }))
  })

  it('treats missing and empty approvedText the same', () => {
    expect(engagementIdempotencyKey({ ...base, approvedText: null }))
      .toBe(engagementIdempotencyKey({ ...base, approvedText: '' }))
  })
})
