// Shared time-slot definitions for the calendar grid.
// Slot hours are wall-clock hours in the workspace timezone (the calendar reasons
// in the workspace tz). The legacy snap helpers below operate in *browser-local*
// time; prefer the *InZone variants on any path that knows the workspace tz.

import { DateTime } from 'luxon'

export interface TimeSlot {
  label: string
  hour: number
}

export const TIME_SLOTS: TimeSlot[] = [
  { label: '7am',  hour: 7  },
  { label: '9am',  hour: 9  },
  { label: '12pm', hour: 12 },
  { label: '2pm',  hour: 14 },
  { label: '5pm',  hour: 17 },
]

export const TIME_SLOT_HOURS: number[] = TIME_SLOTS.map((s) => s.hour)

export function nearestSlotHour(hour: number): number {
  return TIME_SLOT_HOURS.reduce((a, b) =>
    Math.abs(b - hour) < Math.abs(a - hour) ? b : a
  )
}

// Returns a new Date snapped to the nearest TIME_SLOT hour in local time
// (minutes/seconds zeroed). Used by schedule pickers so saved time matches
// what the calendar grid will display.
export function snapToNearestSlot(date: Date): Date {
  const snapped = new Date(date)
  snapped.setHours(nearestSlotHour(date.getHours()), 0, 0, 0)
  return snapped
}

// Rounds FORWARD to the next valid TIME_SLOT hour in local time (10:07 → 12pm).
// Forward-snapping is the intuitive choice for scheduling and never moves a
// future time backward into the past. If the time is past the last slot of the
// day, rolls to the first slot of the next day. Leaves snapToNearestSlot()
// untouched for existing callers.
export function snapToNextSlot(date: Date): Date {
  const snapped = new Date(date)
  const hour = date.getHours()
  const hasRemainder =
    date.getMinutes() > 0 || date.getSeconds() > 0 || date.getMilliseconds() > 0

  // Already exactly on a slot boundary — keep it.
  if (!hasRemainder && TIME_SLOT_HOURS.includes(hour)) {
    snapped.setHours(hour, 0, 0, 0)
    return snapped
  }

  const nextHour = TIME_SLOT_HOURS.find((h) => h > hour)
  if (nextHour !== undefined) {
    snapped.setHours(nextHour, 0, 0, 0)
  } else {
    // Past the last slot — roll to the first slot of the next day.
    snapped.setDate(snapped.getDate() + 1)
    snapped.setHours(TIME_SLOT_HOURS[0], 0, 0, 0)
  }
  return snapped
}

// Parses an ISO timestamp, snaps it FORWARD to the next valid slot, and confirms
// the result is still in the future. Returns null if the input is invalid or the
// snapped time is not in the future. Shared by the reschedule client + API so
// both enforce identical rules. Order matters: parse → snap → future-check.
export function snapAndValidateScheduledTime(iso: string): Date | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const snapped = snapToNextSlot(d)
  if (snapped.getTime() <= Date.now()) return null
  return snapped
}

// Snaps an instant FORWARD to the next slot, reading the hour in the WORKSPACE
// timezone (not browser-local). Returns a UTC ISO string, or null if the input
// is unparseable. Past the last slot, rolls to the first slot of the next local
// day. DST-correct via Luxon.
export function snapToNextSlotInZone(iso: string, zone: string): string | null {
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(zone)
  if (!dt.isValid) return null

  const hour = dt.hour
  const hasRemainder = dt.minute > 0 || dt.second > 0 || dt.millisecond > 0

  let snapped: DateTime
  if (!hasRemainder && TIME_SLOT_HOURS.includes(hour)) {
    snapped = dt.set({ minute: 0, second: 0, millisecond: 0 })
  } else {
    const nextHour = TIME_SLOT_HOURS.find((h) => h > hour)
    if (nextHour !== undefined) {
      snapped = dt.set({ hour: nextHour, minute: 0, second: 0, millisecond: 0 })
    } else {
      snapped = dt
        .plus({ days: 1 })
        .set({ hour: TIME_SLOT_HOURS[0], minute: 0, second: 0, millisecond: 0 })
    }
  }
  return snapped.toUTC().toISO()
}

// Workspace-tz counterpart to snapAndValidateScheduledTime: parse → snap forward
// in the workspace tz → future-check. `nowMs` is injectable for testing.
export function snapAndValidateScheduledTimeInZone(
  iso: string,
  zone: string,
  nowMs: number = Date.now()
): string | null {
  const snapped = snapToNextSlotInZone(iso, zone)
  if (!snapped) return null
  if (new Date(snapped).getTime() <= nowMs) return null
  return snapped
}
