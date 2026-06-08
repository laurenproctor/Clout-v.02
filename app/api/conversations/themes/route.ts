import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listConversationThemes } from '@/lib/domain/conversations'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await listConversationThemes(session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}
