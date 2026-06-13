// Workspace-timezone-aware date math for the calendar.
//
// The calendar reasons about days, weeks, and slots in the *workspace* timezone
// (scheduling_preferences.timezone, e.g. 'America/New_York') — never the browser's
// timezone and never UTC. A scheduled_at is an absolute instant; these helpers
// project it into, and out of, the workspace timezone so the grid, the week query
// window, and the pickers all agree on which local day/hour an instant falls on.

import { DateTime } from 'luxon'

// Used when a workspace has no scheduling_preferences row yet. Mirrors the
// scheduling_preferences.timezone column default and scheduling FALLBACK_PREFS.
export const DEFAULT_TIMEZONE = 'America/New_York'

// ISO date (YYYY-MM-DD) of the Monday that starts the workspace-tz week containing
// `instant`. Monday-based to match the grid's day intents.
export function zonedWeekStart(instant: Date | string, zone: string): string {
  const dt =
    typeof instant === 'string'
      ? DateTime.fromISO(instant, { zone })
      : DateTime.fromJSDate(instant, { zone })
  return dt.startOf('week').toISODate()!
}

// Half-open UTC instant range [startUtc, endUtc) bounding one workspace-tz week.
// `weekStart` is a YYYY-MM-DD date naming the local Monday. The bounds are local
// midnight -> local midnight 7 days later, converted to UTC (DST-correct).
export function zonedWeekWindowUtc(
  weekStart: string,
  zone: string
): { startUtc: string; endUtc: string } {
  const start = DateTime.fromISO(weekStart, { zone }).startOf('day')
  const end = start.plus({ days: 7 })
  return { startUtc: start.toUTC().toISO()!, endUtc: end.toUTC().toISO()! }
}

// The workspace-tz calendar day (YYYY-MM-DD) an instant falls on.
export function zonedDateKey(iso: string, zone: string): string {
  return DateTime.fromISO(iso, { setZone: true }).setZone(zone).toISODate()!
}

// The workspace-tz hour-of-day (0-23) an instant falls on.
export function zonedHour(iso: string, zone: string): number {
  return DateTime.fromISO(iso, { setZone: true }).setZone(zone).hour
}

export interface ZonedDay {
  dateKey: string // YYYY-MM-DD in the workspace tz
  dayNum: number // day-of-month
  weekday: number // 0=Sun .. 6=Sat (matches Date.getDay / DayHeader intents)
}

// The first `count` local days of the week starting at `weekStart`.
export function zonedWeekDays(
  weekStart: string,
  zone: string,
  count: number
): ZonedDay[] {
  const start = DateTime.fromISO(weekStart, { zone }).startOf('day')
  return Array.from({ length: count }, (_, i) => {
    const d = start.plus({ days: i })
    return {
      dateKey: d.toISODate()!,
      dayNum: d.day,
      weekday: d.weekday % 7, // luxon weekday: Mon=1..Sun=7 -> 0=Sun..6=Sat
    }
  })
}
