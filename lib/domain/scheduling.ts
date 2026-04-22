import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import type { SchedulingPreferences } from '@/types/domain'

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): SchedulingPreferences {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    postsPerWeek: row.posts_per_week as number,
    preferredDays: row.preferred_days as number[],
    preferredTimes: row.preferred_times as string[],
    timezone: row.timezone as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getSchedulingPreferences(
  workspaceId: string
): Promise<SchedulingPreferences | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scheduling_preferences')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  return data ? mapRow(data as Record<string, unknown>) : null
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function upsertSchedulingPreferences(
  workspaceId: string,
  input: Partial<Pick<SchedulingPreferences, 'postsPerWeek' | 'preferredDays' | 'preferredTimes' | 'timezone'>>
): Promise<SchedulingPreferences> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scheduling_preferences')
    .upsert(
      {
        workspace_id: workspaceId,
        ...(input.postsPerWeek !== undefined && { posts_per_week: input.postsPerWeek }),
        ...(input.preferredDays !== undefined && { preferred_days: input.preferredDays }),
        ...(input.preferredTimes !== undefined && { preferred_times: input.preferredTimes }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

// ─── Slot Assignment ──────────────────────────────────────────────────────────

const FALLBACK_PREFS = {
  postsPerWeek: 3,
  preferredDays: [1, 3, 5],   // Mon, Wed, Fri (ISO weekday)
  preferredTimes: ['09:00'],
  timezone: 'America/New_York',
}

/**
 * Returns the next available scheduled_at as a UTC ISO string.
 * Looks 14 days forward using preferred weekdays + times from prefs.
 * Skips already-taken slots. Falls back to next weekday 9am local.
 *
 * Uses ISO weekdays: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
 */
export function assignNextSlot(
  prefs: SchedulingPreferences | null,
  taken: string[]
): string {
  const tz = prefs?.timezone ?? FALLBACK_PREFS.timezone
  const preferredDays = prefs?.preferredDays ?? FALLBACK_PREFS.preferredDays
  const preferredTimes = prefs?.preferredTimes ?? FALLBACK_PREFS.preferredTimes

  const now = DateTime.now().setZone(tz)

  // Normalise taken set to minute precision for dedup
  const takenSet = new Set(
    taken
      .filter(Boolean)
      .map((s) => DateTime.fromISO(s).setZone(tz).startOf('minute').toISO())
  )

  const sortedTimes = [...preferredTimes].sort()
  const sortedDays = [...preferredDays].sort()

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const day = now.plus({ days: dayOffset }).startOf('day')

    if (!sortedDays.includes(day.weekday)) continue

    for (const timeStr of sortedTimes) {
      const [hh, mm] = timeStr.split(':').map(Number)
      const candidate = day.set({ hour: hh, minute: mm, second: 0, millisecond: 0 })

      if (candidate <= now) continue

      const key = candidate.startOf('minute').toISO()!
      if (takenSet.has(key)) continue

      return candidate.toUTC().toISO()!
    }
  }

  // Fallback: next weekday at 9am local
  let fallback = now.plus({ days: 1 }).startOf('day').set({ hour: 9 })
  while (fallback.weekday === 6 || fallback.weekday === 7) {
    fallback = fallback.plus({ days: 1 })
  }
  return fallback.toUTC().toISO()!
}
