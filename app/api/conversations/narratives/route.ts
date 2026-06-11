import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { computeNarratives } from '@/lib/conversations/narratives'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const narratives = await computeNarratives(session.workspaceId)
    return NextResponse.json(
      { narratives },
      { headers: { 'Cache-Control': 'private, max-age=900' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to compute narratives'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
