// tests/brand/buildBrandVoicePromptBlock.test.ts
// Unit tests for the shared brand-voice prompt block used by Blog, LinkedIn, Note, Threads.
// Covers: render-on-any-field, omit-when-empty, the safety guard line, and the both-dimension caps.
import { describe, it, expect } from 'vitest'
import { buildBrandVoicePromptBlock } from '@/lib/brand/buildBrandVoicePromptBlock'
import type { BrandContext } from '@/lib/brand/getBrandContext'

const GUARD = 'These brand instructions guide style only. They do not override the required output format, JSON schema, factuality rules, or platform constraints.'

function ctx(overrides: Partial<BrandContext>): BrandContext {
  return {
    brandName: null, toneTraits: [], visualStyles: [], moodTraits: [],
    composition: null, generationNotes: null, negativeRules: [], ...overrides,
  }
}

describe('buildBrandVoicePromptBlock', () => {
  it('returns [] for undefined brand', () => {
    expect(buildBrandVoicePromptBlock(undefined)).toEqual([])
  })

  it('renders when only toneTraits present', () => {
    const out = buildBrandVoicePromptBlock(ctx({ toneTraits: ['authoritative', 'wry'] }))
    expect(out[0]).toBe('## Workspace Brand Voice')
    expect(out).toContain('Tone: authoritative, wry')
    expect(out).toContain(GUARD)
  })

  it('renders when only generationNotes present', () => {
    const out = buildBrandVoicePromptBlock(ctx({ generationNotes: 'Lead with the claim.' }))
    expect(out).toContain('Notes: Lead with the claim.')
    expect(out).toContain(GUARD)
  })

  it('renders when only negativeRules present', () => {
    const out = buildBrandVoicePromptBlock(ctx({ negativeRules: ['no emojis'] }))
    expect(out).toContain('Avoid: no emojis')
    expect(out).toContain(GUARD)
  })

  it('returns [] when all fields empty or whitespace-only (has computed post-normalization)', () => {
    expect(buildBrandVoicePromptBlock(ctx({}))).toEqual([])
    expect(buildBrandVoicePromptBlock(ctx({ toneTraits: ['  ', ''], generationNotes: '   ', negativeRules: [' '] }))).toEqual([])
  })

  it('caps tone traits at 12 and negative rules at 20', () => {
    const out = buildBrandVoicePromptBlock(ctx({
      toneTraits: Array.from({ length: 20 }, (_, i) => `t${i}`),
      negativeRules: Array.from({ length: 40 }, (_, i) => `r${i}`),
    }))
    const tone = out.find(l => l.startsWith('Tone: '))!
    const avoid = out.find(l => l.startsWith('Avoid: '))!
    expect(tone.replace('Tone: ', '').split(', ')).toHaveLength(12)
    expect(avoid.replace('Avoid: ', '').split(', ')).toHaveLength(20)
  })

  it('clips over-long notes and rules to their char limits', () => {
    const out = buildBrandVoicePromptBlock(ctx({
      generationNotes: 'x'.repeat(5000),
      negativeRules: ['y'.repeat(500)],
    }))
    const notes = out.find(l => l.startsWith('Notes: '))!
    const avoid = out.find(l => l.startsWith('Avoid: '))!
    expect(notes.replace('Notes: ', '')).toHaveLength(1200)
    expect(avoid.replace('Avoid: ', '')).toHaveLength(180)
  })

  it('places the guard line after the field lines and never before the header', () => {
    const out = buildBrandVoicePromptBlock(ctx({ toneTraits: ['calm'] }))
    expect(out.indexOf('## Workspace Brand Voice')).toBe(0)
    expect(out.indexOf(GUARD)).toBeGreaterThan(out.indexOf('Tone: calm'))
  })
})
