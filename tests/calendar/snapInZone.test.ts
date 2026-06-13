import { describe, it, expect } from 'vitest'
import { snapAndValidateScheduledTimeInZone } from '@/lib/calendar/slots'

const NY = 'America/New_York'
// A fixed "now" well before the future cases so the future-check passes.
const NOW = Date.UTC(2030, 5, 1, 0, 0, 0)

function ms(iso: string | null): number | null {
  return iso ? new Date(iso).getTime() : null
}

describe('snapAndValidateScheduledTimeInZone', () => {
  it('keeps a time already on a workspace-tz slot', () => {
    // 13:00Z == 9:00 EDT, which is a slot.
    expect(ms(snapAndValidateScheduledTimeInZone('2030-06-10T13:00:00Z', NY, NOW))).toBe(
      Date.UTC(2030, 5, 10, 13, 0, 0)
    )
  })

  it('snaps forward to the next slot in workspace-tz hours', () => {
    // 14:30Z == 10:30 EDT -> next slot 12:00 EDT == 16:00Z
    expect(ms(snapAndValidateScheduledTimeInZone('2030-06-10T14:30:00Z', NY, NOW))).toBe(
      Date.UTC(2030, 5, 10, 16, 0, 0)
    )
  })

  it('rolls past the last slot to the next local day first slot', () => {
    // 23:00Z == 19:00 EDT (past 17) -> next day 7:00 EDT June 11 == 11:00Z
    expect(ms(snapAndValidateScheduledTimeInZone('2030-06-10T23:00:00Z', NY, NOW))).toBe(
      Date.UTC(2030, 5, 11, 11, 0, 0)
    )
  })

  it('returns null for invalid input', () => {
    expect(snapAndValidateScheduledTimeInZone('not-a-date', NY, NOW)).toBeNull()
  })

  it('returns null when the snapped time is not in the future', () => {
    expect(snapAndValidateScheduledTimeInZone('2020-01-01T12:00:00Z', NY, NOW)).toBeNull()
  })
})
