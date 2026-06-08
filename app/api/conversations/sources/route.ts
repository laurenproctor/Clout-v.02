import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { isSafeUrl } from '@/lib/scraper/isSafeUrl'
import { getProvider } from '@/lib/conversations/providers'
import { listConversationSources, insertConversationSource } from '@/lib/domain/conversations'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await listConversationSources(session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.sourceUrl) return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
  if (!isSafeUrl(body.sourceUrl)) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  const provider = getProvider(body.sourceUrl)
  const result = await insertConversationSource({
    workspaceId: session.workspaceId,
    sourceType: provider.sourceType,
    sourceUrl: body.sourceUrl,
    title: body.title ?? null,
    author: body.author ?? null,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data, { status: 201 })
}
