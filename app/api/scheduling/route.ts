import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getSchedulingPreferences, upsertSchedulingPreferences } from '@/lib/domain/scheduling'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await getSchedulingPreferences(session.workspaceId)
  return NextResponse.json(
    prefs ?? {
      postsPerWeek: 3,
      preferredDays: [1, 3, 5],
      preferredTimes: ['09:00', '12:00', '17:00'],
      timezone: 'America/New_York',
    }
  )
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const prefs = await upsertSchedulingPreferences(session.workspaceId, {
    postsPerWeek: body.postsPerWeek,
    preferredDays: body.preferredDays,
    preferredTimes: body.preferredTimes,
    timezone: body.timezone,
  })
  return NextResponse.json(prefs)
}
