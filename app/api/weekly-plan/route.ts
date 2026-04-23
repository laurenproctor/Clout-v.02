import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildWeeklyPlan } from '@/lib/domain/weekly-plan'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await buildWeeklyPlan(session.workspaceId)
    return NextResponse.json(items)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to build plan'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
