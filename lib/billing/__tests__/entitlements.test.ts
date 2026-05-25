import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS } from '../entitlements'

describe('PLAN_LIMITS', () => {
  it('free plan is permissive', () => {
    expect(PLAN_LIMITS.free.workspaces).toBe(99)
    expect(PLAN_LIMITS.free.accounts).toBe(99)
    expect(PLAN_LIMITS.free.members).toBe(99)
  })

  it('pro plan has defined limits', () => {
    expect(PLAN_LIMITS.pro.workspaces).toBe(5)
    expect(PLAN_LIMITS.pro.accounts).toBe(20)
    expect(PLAN_LIMITS.pro.members).toBe(5)
  })

  it('enterprise plan is permissive', () => {
    expect(PLAN_LIMITS.enterprise.workspaces).toBe(99)
  })

  it('all plans have required keys', () => {
    for (const plan of Object.values(PLAN_LIMITS)) {
      expect(typeof plan.workspaces).toBe('number')
      expect(typeof plan.channels).toBe('number')
      expect(typeof plan.accounts).toBe('number')
      expect(typeof plan.members).toBe('number')
    }
  })
})

describe('check logic', () => {
  function check(current: number, limit: number, resource: string) {
    if (current < limit) return { allowed: true as const }
    return {
      allowed: false as const,
      reason: `Your plan allows ${limit} ${resource}. Upgrade to add more.`,
      limit,
      current,
    }
  }

  it('allows when under limit', () => {
    const result = check(2, 5, 'workspace')
    expect(result.allowed).toBe(true)
  })

  it('blocks when at limit', () => {
    const result = check(5, 5, 'workspace')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.limit).toBe(5)
      expect(result.current).toBe(5)
    }
  })

  it('blocks when over limit', () => {
    const result = check(6, 5, 'workspace')
    expect(result.allowed).toBe(false)
  })

  it('includes helpful reason message', () => {
    const result = check(5, 5, 'workspace')
    if (!result.allowed) {
      expect(result.reason).toContain('5 workspace')
      expect(result.reason).toContain('Upgrade')
    }
  })
})
