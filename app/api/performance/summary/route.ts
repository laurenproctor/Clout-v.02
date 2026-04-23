import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPerformanceSummary } from '@/lib/domain/weekly-plan'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const summary = await getPerformanceSummary(session.workspaceId)
    return NextResponse.json(summary)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get summary'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
