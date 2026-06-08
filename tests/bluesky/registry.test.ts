import { describe, it, expect } from 'vitest'
import { PLATFORM_REGISTRY } from '@/lib/syndication/registry'

describe('PLATFORM_REGISTRY — bluesky', () => {
  it('is registered', () => {
    expect(PLATFORM_REGISTRY['bluesky']).toBeDefined()
  })

  it('has correct identity', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.identity.id).toBe('bluesky')
    expect(def.identity.label).toBe('BlueSky')
  })

  it('has correct generation config', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.generation.maxPostLength).toBe(300)
    expect(def.generation.softPostLength).toBe(270)
    expect(def.generation.maxTokens).toBe(150)
  })

  it('has a behavior model with required fields', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.model.rhetoricalEnvironment).toBeTruthy()
    expect(def.model.structuralRules.length).toBeGreaterThan(0)
    expect(def.model.antiPatterns.length).toBeGreaterThan(0)
    expect(def.model.lengthTarget).toBeTruthy()
  })

  it('does not support threads (v1)', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.capabilities.supportsThreads).toBe(false)
  })

  it('supports platform scheduling', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.capabilities.platformScheduling).toBe(true)
  })
})
