// Shared time-slot definitions for the calendar grid.
// Hours are local-time hours (matches what users see and what datetime-local emits).

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
