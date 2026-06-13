import { describe, it, expect } from 'vitest'
import { generateIdempotencyKey } from '@/lib/publishing/idempotency'

const base = {
  workspaceId: 'ws_1',
  canonicalContentId: 'out_1',
  provider: 'substack' as const,
  connectionId: 'conn_1',
}

describe('generateIdempotencyKey — action-specific', () => {
  it('produces different keys for different intended actions', () => {
    const draft = generateIdempotencyKey({ ...base, intendedAction: 'substack_newsletter_draft' })
    const web   = generateIdempotencyKey({ ...base, intendedAction: 'substack_newsletter_publish_web' })
    const email = generateIdempotencyKey({ ...base, intendedAction: 'substack_newsletter_send_email' })
    const note  = generateIdempotencyKey({ ...base, intendedAction: 'substack_note_publish' })
    expect(new Set([draft, web, email, note]).size).toBe(4)
  })

  it('is stable for identical inputs', () => {
    const a = generateIdempotencyKey({ ...base, intendedAction: 'substack_newsletter_send_email' })
    const b = generateIdempotencyKey({ ...base, intendedAction: 'substack_newsletter_send_email' })
    expect(a).toBe(b)
  })

  it('differs by connection id (no cross-publication collision)', () => {
    const a = generateIdempotencyKey({ ...base, connectionId: 'conn_A', intendedAction: 'substack_note_publish' })
    const b = generateIdempotencyKey({ ...base, connectionId: 'conn_B', intendedAction: 'substack_note_publish' })
    expect(a).not.toBe(b)
  })

  it('preserves legacy keys when no intendedAction is supplied', () => {
    // Existing single-action providers must keep byte-identical keys.
    const legacy = generateIdempotencyKey(base)
    const withUndefined = generateIdempotencyKey({ ...base, intendedAction: undefined })
    expect(legacy).toBe(withUndefined)
    // And appending an action must change the key vs. the legacy form.
    expect(legacy).not.toBe(generateIdempotencyKey({ ...base, intendedAction: 'substack_newsletter_draft' }))
  })
})
