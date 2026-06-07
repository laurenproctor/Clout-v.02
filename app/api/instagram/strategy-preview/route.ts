import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { runStrategyPreview } from '@/lib/instagram/runStrategyPreview'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sourceContent } = body as { sourceContent?: string }
  if (!sourceContent?.trim()) {
    return NextResponse.json({ error: 'sourceContent is required' }, { status: 400 })
  }

  const result = await runStrategyPreview(sourceContent)
  return NextResponse.json(result)
}
