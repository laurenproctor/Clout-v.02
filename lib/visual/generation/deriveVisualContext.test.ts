// lib/visual/generation/deriveVisualContext.test.ts
import { describe, it, expect } from 'vitest'
import { deriveVisualContext } from './deriveVisualContext'
import type { VisualIntent } from '../types/visual'

const baseIntent: VisualIntent = {
  attentionStrategy: 'contrast',
  viewerEmotion: 'quiet confidence',
  visualConcept: 'A lone architect reviewing blueprints in a glass office at dusk',
  compositionStyle: 'rule of thirds with generous negative space',
  colorMood: 'deep navy and cool steel, warm amber accent',
  lightingStyle: 'soft diffused window light from the left',
  visualDensity: 'minimal',
  overlayRecommendation: 'none',
  renderMode: 'fully-generated',
  creativeRisk: 'balanced',
  platformRationale: 'editorial restraint performs well on LinkedIn',
  negativeSpace: ['clutter', 'busy backgrounds'],
}

describe('deriveVisualContext', () => {
  it('returns a non-empty string', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('includes composition style', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toContain('rule of thirds')
  })

  it('includes color mood', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toContain('deep navy')
  })

  it('includes viewer emotion', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toContain('quiet confidence')
  })

  it('includes brand archetype when provided', () => {
    const result = deriveVisualContext(baseIntent, 'Editorial Luxury')
    expect(result).toContain('Editorial Luxury')
  })

  it('does not include raw prompts or technical fields', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).not.toContain('fully-generated')
    expect(result).not.toContain('platformRationale')
    expect(result).not.toContain('negativeSpace')
  })
})
