import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProviderConnection, PublishOptions } from '@/lib/publishing/types'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'

// ── Controllable capability gate + master switch ──────────────────────────────
const gate = vi.hoisted(() => ({ enabled: true, directPublish: false }))
vi.mock('@/lib/features', () => ({
  FEATURES: { get substackDirectPublish() { return gate.directPublish } },
  isSubstackActionEnabled: () => gate.enabled,
}))

// ── Mock the network client but keep the real error classes (instanceof matters) ──
const createDraft = vi.hoisted(() => vi.fn())
vi.mock('@/lib/publishing/providers/substack/client', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/publishing/providers/substack/client')>()
  return { ...actual, createDraft }
})

// ── Mock session management ────────────────────────────────────────────────────
const getActiveSession = vi.hoisted(() => vi.fn())
const forceRenewSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/publishing/providers/substack/session', () => ({ getActiveSession, forceRenewSession }))

import { substackProvider } from '@/lib/publishing/providers/substack'
import { SubstackAuthError } from '@/lib/publishing/providers/substack/client'

const connection: ProviderConnection = {
  id: 'conn_1',
  workspaceId: 'ws_1',
  createdBy: 'user_1',
  provider: 'substack',
  label: 'My Stack',
  siteUrl: 'https://mystack.substack.com',
  encryptedAccessToken: 'enc',
  metadata: { publication_subdomain: 'mystack', publication_name: 'My Stack' },
  isActive: true,
  lastSuccessfulPublishAt: null,
  lastFailedPublishAt: null,
  consecutiveFailureCount: 0,
  lastErrorMessage: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const article: CanonicalArticle = {
  title: 'Hello',
  excerpt: 'sub',
  body: [{ type: 'paragraph', html: 'World' }],
} as CanonicalArticle

const draftOpts: PublishOptions = { status: 'draft', substackIntendedAction: 'substack_newsletter_draft' }

beforeEach(() => {
  gate.enabled = true
  gate.directPublish = false
  createDraft.mockReset()
  getActiveSession.mockReset().mockResolvedValue('cookie-1')
  forceRenewSession.mockReset()
})

describe('substackProvider.publish — capability gating', () => {
  it('blocks a direct action when the master switch is off (direct_publish_disabled)', async () => {
    gate.enabled = false
    gate.directPublish = false
    const res = await substackProvider.publish(connection, article, { status: 'publish', substackIntendedAction: 'substack_note_publish' }, 'k')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('direct_publish_disabled')
    expect(createDraft).not.toHaveBeenCalled()
  })

  it('blocks a direct action when only the capability is unverified (capability_unverified)', async () => {
    gate.enabled = false
    gate.directPublish = true
    const res = await substackProvider.publish(connection, article, { status: 'publish', substackIntendedAction: 'substack_newsletter_send_email' }, 'k')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('capability_unverified')
    expect(createDraft).not.toHaveBeenCalled()
  })
})

describe('substackProvider.publish — draft fail-closed behavior', () => {
  it('creates a draft on the happy path', async () => {
    createDraft.mockResolvedValue({ id: 42, slug: 'hello', url: 'https://mystack.substack.com/p/hello' })
    const res = await substackProvider.publish(connection, article, draftOpts, 'k')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.providerContentId).toBe('42')
      expect(res.status).toBe('draft')
    }
  })

  it('fails closed on an unexpected response shape (no id)', async () => {
    createDraft.mockResolvedValue({ id: 0, slug: '', url: '' })
    const res = await substackProvider.publish(connection, article, draftOpts, 'k')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('unexpected_response_shape')
  })

  it('fails closed when the provider URL is missing', async () => {
    createDraft.mockResolvedValue({ id: 42, slug: 'hello', url: '' })
    const res = await substackProvider.publish(connection, article, draftOpts, 'k')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('missing_provider_url')
  })

  it('renews the session once on auth failure, then succeeds', async () => {
    createDraft
      .mockRejectedValueOnce(new SubstackAuthError('Session expired.'))
      .mockResolvedValueOnce({ id: 7, slug: 's', url: 'https://mystack.substack.com/p/s' })
    forceRenewSession.mockResolvedValue('cookie-2')

    const res = await substackProvider.publish(connection, article, draftOpts, 'k')
    expect(forceRenewSession).toHaveBeenCalledTimes(1)
    expect(createDraft).toHaveBeenCalledTimes(2)
    expect(res.ok).toBe(true)
  })

  it('fails closed with auth_failed when session renewal fails', async () => {
    createDraft.mockRejectedValue(new SubstackAuthError('Session expired.'))
    forceRenewSession.mockRejectedValue(new SubstackAuthError('No stored credentials.'))

    const res = await substackProvider.publish(connection, article, draftOpts, 'k')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('auth_failed')
    // renewal attempted exactly once
    expect(forceRenewSession).toHaveBeenCalledTimes(1)
  })
})
