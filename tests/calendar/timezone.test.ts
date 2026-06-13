import { describe, it, expect } from 'vitest'
import {
  zonedWeekStart,
  zonedWeekWindowUtc,
  zonedDateKey,
  zonedHour,
  zonedWeekDays,
} from '@/lib/calendar/timezone'

const NY = 'America/New_York'

describe('zonedWeekStart', () => {
  it('returns the workspace-tz Monday for a mid-week instant', () => {
    // 2026-06-11T22:00 EDT (Thursday) -> week of Mon Jun 8
    expect(zonedWeekStart('2026-06-12T02:00:00Z', NY)).toBe('2026-06-08')
  })

  it('keeps Sunday-night-local in the same week even though UTC has rolled to Monday', () => {
    // 2026-06-14T23:00 EDT (Sunday) is 2026-06-15T03:00Z (Monday in UTC).
    // The workspace-tz week is still the one starting Mon Jun 8 — this is the seam.
    expect(zonedWeekStart('2026-06-15T03:00:00Z', NY)).toBe('2026-06-08')
  })
})

describe('zonedWeekWindowUtc', () => {
  it('bounds the local week as half-open UTC instants (EDT, -04:00)', () => {
    const { startUtc, endUtc } = zonedWeekWindowUtc('2026-06-08', NY)
    expect(new Date(startUtc).getTime()).toBe(Date.UTC(2026, 5, 8, 4, 0, 0))
    expect(new Date(endUtc).getTime()).toBe(Date.UTC(2026, 5, 15, 4, 0, 0))
  })

  it('uses the correct offset in winter (EST, -05:00)', () => {
    const { startUtc, endUtc } = zonedWeekWindowUtc('2026-01-05', NY)
    expect(new Date(startUtc).getTime()).toBe(Date.UTC(2026, 0, 5, 5, 0, 0))
    expect(new Date(endUtc).getTime()).toBe(Date.UTC(2026, 0, 12, 5, 0, 0))
  })
})

describe('zonedDateKey / zonedHour', () => {
  it('reads the workspace-tz calendar day and hour of an instant (EDT)', () => {
    expect(zonedDateKey('2026-06-08T13:00:00Z', NY)).toBe('2026-06-08')
    expect(zonedHour('2026-06-08T13:00:00Z', NY)).toBe(9)
  })

  it('places a UTC-Monday-early-morning instant on the previous local Sunday', () => {
    expect(zonedDateKey('2026-06-15T03:00:00Z', NY)).toBe('2026-06-14')
    expect(zonedHour('2026-06-15T03:00:00Z', NY)).toBe(23)
  })

  it('reads the correct hour in winter (EST)', () => {
    expect(zonedHour('2026-01-12T13:00:00Z', NY)).toBe(8)
  })
})

describe('zonedWeekDays', () => {
  it('returns the first N local days of the week with date keys and weekday numbers', () => {
    const days = zonedWeekDays('2026-06-08', NY, 5)
    expect(days.map((d) => d.dateKey)).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
    ])
    expect(days[0]).toMatchObject({ dateKey: '2026-06-08', dayNum: 8, weekday: 1 })
    expect(days[4]).toMatchObject({ dateKey: '2026-06-12', dayNum: 12, weekday: 5 })
  })
})
