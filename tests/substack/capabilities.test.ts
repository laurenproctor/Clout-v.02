import { describe, it, expect } from 'vitest'
import { substackCapabilityForAction } from '@/lib/features'
import { buildSubstackFallback } from '@/lib/publishing/providers/substack/fallback'

describe('substackCapabilityForAction', () => {
  it('maps each canonical action to its capability flag', () => {
    expect(substackCapabilityForAction('substack_newsletter_draft')).toBe('newsletterDraft')
    expect(substackCapabilityForAction('substack_note_publish')).toBe('notesPublish')
    expect(substackCapabilityForAction('substack_newsletter_publish_web')).toBe('newsletterPublishWeb')
    expect(substackCapabilityForAction('substack_newsletter_send_email')).toBe('newsletterSendEmail')
  })

  it('returns null for unknown actions', () => {
    expect(substackCapabilityForAction('something_else')).toBeNull()
  })
})

describe('buildSubstackFallback', () => {
  it('offers reconnect on auth failure', () => {
    const fb = buildSubstackFallback('auth_failed')
    expect(fb.ok).toBe(false)
    expect(fb.status).toBe('manual_fallback_required')
    expect(fb.fallback.actions).toContain('reconnect')
  })

  it('does not fabricate a published state on unexpected shape', () => {
    const fb = buildSubstackFallback('unexpected_response_shape')
    expect(fb.reason).toBe('unexpected_response_shape')
    expect(fb.fallback.actions).toEqual(['copy_content', 'open_substack'])
  })

  it('never exposes internal codes in user-facing copy', () => {
    const fb = buildSubstackFallback('direct_publish_disabled')
    expect(fb.fallback.message).not.toContain('direct_publish_not_available')
    expect(fb.fallback.title).toMatch(/Substack/i)
  })
})
