import { describe, it, expect } from 'vitest'
import { buildNarrativeArcs, STANDALONE_ARC_ID } from '@/lib/domain/calendar'
import type { CalendarConcept } from '@/types/calendar'

function concept(overrides: Partial<CalendarConcept>): CalendarConcept {
  return {
    conceptId: 'c1',
    headline: 'Untitled',
    scheduledAt: '2026-06-15T13:00:00+00:00',
    goal: null,
    narrativeRole: null,
    narrativeArcId: null,
    narrativeArcName: null,
    funnelStage: null,
    resonancePrediction: null,
    lensNames: [],
    posts: [
      {
        id: 'p1',
        platform: 'linkedin',
        accountName: 'LinkedIn',
        handle: null,
        status: 'queued',
        scheduledAt: '2026-06-15T13:00:00+00:00',
        channelId: 'ch1',
      },
    ],
    ...overrides,
  }
}

describe('buildNarrativeArcs', () => {
  it('surfaces un-arced scheduled posts in a standalone group (regression for narrative view hiding posts)', () => {
    const arcs = buildNarrativeArcs([
      concept({ conceptId: 'mon', narrativeArcId: null, headline: 'Monday post' }),
    ])

    expect(arcs).toHaveLength(1)
    const standalone = arcs[0]
    expect(standalone.standalone).toBe(true)
    expect(standalone.arcId).toBe(STANDALONE_ARC_ID)
    expect(standalone.concepts.map((c) => c.conceptId)).toContain('mon')
  })

  it('groups arc-assigned concepts by arc and keeps standalone separate', () => {
    const arcs = buildNarrativeArcs([
      concept({ conceptId: 'a1', narrativeArcId: 'arc-1', narrativeArcName: 'Launch Arc' }),
      concept({ conceptId: 'a2', narrativeArcId: 'arc-1', narrativeArcName: 'Launch Arc' }),
      concept({ conceptId: 'solo', narrativeArcId: null }),
    ])

    const real = arcs.find((a) => a.arcId === 'arc-1')
    const standalone = arcs.find((a) => a.standalone)

    expect(real).toBeDefined()
    expect(real!.concepts).toHaveLength(2)
    expect(real!.arcName).toBe('Launch Arc')
    expect(real!.standalone).toBeFalsy()

    expect(standalone).toBeDefined()
    expect(standalone!.concepts.map((c) => c.conceptId)).toEqual(['solo'])
  })

  it('omits the standalone group entirely when every concept has an arc', () => {
    const arcs = buildNarrativeArcs([
      concept({ conceptId: 'a1', narrativeArcId: 'arc-1', narrativeArcName: 'Arc' }),
    ])
    expect(arcs.some((a) => a.standalone)).toBe(false)
  })

  it('returns no arcs for an empty week', () => {
    expect(buildNarrativeArcs([])).toEqual([])
  })
})
