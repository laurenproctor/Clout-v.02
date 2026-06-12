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
