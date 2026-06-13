import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getNarrativeArcs, getWeekStart } from '@/lib/domain/calendar'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const week =
    new URL(req.url).searchParams.get('week') ??
    (await getWeekStart(session.workspaceId))

  const arcs = await getNarrativeArcs(session.workspaceId, week)
  return NextResponse.json({ arcs, weekStart: week })
}
