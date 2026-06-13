import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock every dependency evaluateUnipileMonitoring touches so the gate logic is tested
// in isolation (no env flags, kill switch, DB, or connection lookups).
vi.mock('@/lib/features', () => ({ FEATURES: { linkedinUnipileEnabled: true } }))
vi.mock('@/lib/unipile/killswitch', () => ({ isUnipileKilled: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/unipile/connection', () => ({ getUnipileConnection: vi.fn() }))

import { evaluateUnipileMonitoring } from '@/lib/unipile/gates'
import { FEATURES } from '@/lib/features'
import { isUnipileKilled } from '@/lib/unipile/killswitch'
import { createServiceClient } from '@/lib/supabase/service'
import { getUnipileConnection } from '@/lib/unipile/connection'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = (fn: unknown) => fn as any

// Makes createServiceClient().from(...).select(...).eq(...).maybeSingle() resolve to the
// given linkedin_beta value (pass undefined to simulate no settings row).
function mockSettings(linkedinBeta: unknown) {
  mock(createServiceClient).mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            linkedinBeta === undefined ? { data: null } : { data: { linkedin_beta: linkedinBeta } },
        }),
      }),
    }),
  })
}

const WS = 'ws-1'

beforeEach(() => {
  vi.clearAllMocks()
  // Happy-path baseline; individual tests override one condition at a time.
  FEATURES.linkedinUnipileEnabled = true
  mock(isUnipileKilled).mockResolvedValue(false)
  mockSettings({ monitoring: true })
  mock(getUnipileConnection).mockResolvedValue({
    accountId: 'acc1', provider: 'linkedin', status: 'connected', connectedAt: '2026-06-01T00:00:00Z',
  })
})

describe('evaluateUnipileMonitoring', () => {
  it('rejects when the master flag is off', async () => {
    FEATURES.linkedinUnipileEnabled = false
    const r = await evaluateUnipileMonitoring({ workspaceId: WS })
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('master_disabled')
  })

  it('rejects when the kill switch is on', async () => {
    mock(isUnipileKilled).mockResolvedValue(true)
    const r = await evaluateUnipileMonitoring({ workspaceId: WS })
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('killed')
  })

  it('rejects when monitoring beta is explicitly false', async () => {
    mockSettings({ monitoring: false })
    const r = await evaluateUnipileMonitoring({ workspaceId: WS })
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('monitoring_gate_off')
  })

  it('rejects when monitoring beta is missing', async () => {
    mockSettings({})
    const r = await evaluateUnipileMonitoring({ workspaceId: WS })
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('monitoring_gate_off')
  })

  it('rejects when there is no Unipile connection', async () => {
    mock(getUnipileConnection).mockResolvedValue(null)
    const r = await evaluateUnipileMonitoring({ workspaceId: WS })
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('not_connected')
  })

  for (const status of ['expired', 'restricted', 'revoked'] as const) {
    it(`rejects when the connection status is ${status}`, async () => {
      mock(getUnipileConnection).mockResolvedValue({
        accountId: 'acc1', provider: 'linkedin', status, connectedAt: '2026-06-01T00:00:00Z',
      })
      const r = await evaluateUnipileMonitoring({ workspaceId: WS })
      expect(r.allowed).toBe(false)
      expect(r.reason).toBe('not_connected')
    })
  }

  it('allows when flag on, kill switch off, monitoring true, and connection is connected', async () => {
    const r = await evaluateUnipileMonitoring({ workspaceId: WS })
    expect(r.allowed).toBe(true)
    expect(r.reason).toBeUndefined()
  })
})
