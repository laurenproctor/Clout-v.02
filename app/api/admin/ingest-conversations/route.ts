import { NextRequest, NextResponse } from 'next/server'
import { ingestAllSources } from '@/lib/conversations/pipeline'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') ?? undefined
  const result = await ingestAllSources(workspaceId)
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const result = await ingestAllSources(body.workspace_id as string | undefined)
  return NextResponse.json({ ok: true, ...result })
}
