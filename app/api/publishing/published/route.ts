import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listPublishedContent } from '@/lib/publishing/domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sourceType = searchParams.get('sourceType') ?? undefined
  const sourceId   = searchParams.get('sourceId')   ?? undefined

  const result = await listPublishedContent({ workspaceId: session.workspaceId, sourceType, sourceId })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}
