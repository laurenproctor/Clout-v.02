import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { rescheduleOutput } from '@/lib/domain/publishing'
import { snapAndValidateScheduledTimeInZone } from '@/lib/calendar/slots'
import { getSchedulingPreferences } from '@/lib/domain/scheduling'
import { DEFAULT_TIMEZONE } from '@/lib/calendar/timezone'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const scheduledAtRaw = body?.scheduled_at

  // Snap forward to the next slot in the WORKSPACE timezone, so the server is the
  // authority on which slot a post lands in regardless of the caller's browser tz.
  // Order: parse → snap → future-check, so a near-now value can't slip through.
  const tz =
    (await getSchedulingPreferences(session.workspaceId))?.timezone ?? DEFAULT_TIMEZONE
  const snapped =
    typeof scheduledAtRaw === 'string'
      ? snapAndValidateScheduledTimeInZone(scheduledAtRaw, tz)
      : null
  if (!snapped) {
    return NextResponse.json(
      { error: 'Scheduled time must be a valid future time.' },
      { status: 400 }
    )
  }

  const ok = await rescheduleOutput(id, snapped)
  if (!ok) {
    return NextResponse.json(
      { error: 'This post is already publishing and can no longer be rescheduled.' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true, scheduledAt: snapped })
}
