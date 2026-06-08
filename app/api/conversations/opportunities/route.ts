import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listConversationOpportunities } from '@/lib/domain/conversations'
import type { ConversationOpportunityStatus } from '@/types/domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = (req.nextUrl.searchParams.get('status') ?? 'active') as ConversationOpportunityStatus
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 100)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0)
  const result = await listConversationOpportunities(session.workspaceId, { status, limit, offset })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}
