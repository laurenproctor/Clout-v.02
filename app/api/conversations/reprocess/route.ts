import { NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { ingestAllSources } from '@/lib/conversations/pipeline'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  after(ingestAllSources(session.workspaceId))
  return NextResponse.json({ ok: true })
}
