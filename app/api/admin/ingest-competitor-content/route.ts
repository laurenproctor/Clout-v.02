import { NextRequest, NextResponse } from 'next/server'
import { ingestCompetitorContent } from '@/lib/competitors/ingest-competitor-content'

function isAuthorized(req: NextRequest): boolean {
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET
    return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
  }
  const secret = process.env.ADMIN_SECRET
  return !!secret && req.headers.get('x-admin-secret') === secret
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await ingestCompetitorContent())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await ingestCompetitorContent())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
