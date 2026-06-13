// Shared time-slot definitions for the calendar grid.
// Slot hours are wall-clock hours in the workspace timezone (the calendar reasons
// in the workspace tz). All snapping is done in the workspace tz via the *InZone
// helpers below; the server is the authority on which slot a post lands in.

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

// Parse → snap forward to the next slot in the workspace tz → future-check.
// Returns a UTC ISO string, or null if the input is invalid or the snapped time
// is not in the future. `nowMs` is injectable for testing.
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
