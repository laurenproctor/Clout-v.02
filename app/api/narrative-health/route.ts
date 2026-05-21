import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getNarrativeHealth, getIntelligenceSignals } from '@/lib/domain/calendar'

export async function GET() {
  const session = await getSession()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [health, signals] = await Promise.all([
    getNarrativeHealth(session.workspaceId),
    getIntelligenceSignals(session.workspaceId),
  ])

  return NextResponse.json({ health, signals })
}
