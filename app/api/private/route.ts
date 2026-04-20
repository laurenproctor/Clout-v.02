import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPrivateFeed, getEnrichedFeed } from '@/lib/domain/private'
import { createCapture } from '@/lib/domain/capture'
import { enrichPrivateJob } from '@/lib/trigger/jobs/enrich-private'
import type { CaptureSource } from '@/types/domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'raw'
  const tags = searchParams.get('tags')?.split(',').filter(Boolean)

  if (view === 'enriched') {
    const enrichments = await getEnrichedFeed({
      workspaceId: session.workspaceId,
      createdBy: session.userId,
      tags,
    })
    return NextResponse.json(enrichments)
  }

  const captures = await getPrivateFeed({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    tags,
    limit: Number(searchParams.get('limit') ?? 50),
  })
  return NextResponse.json(captures)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const source: CaptureSource = body.source ?? 'text'

  if (!body.raw_content && !body.source_url) {
    return NextResponse.json(
      { error: 'raw_content or source_url required' },
      { status: 400 }
    )
  }

  const result = await createCapture({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    source,
    rawContent: body.raw_content ?? null,
    sourceUrl: body.source_url ?? null,
    isPrivate: true,
    tags: body.tags ?? [],
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Dispatch enrichment job (best-effort — don't fail the request if this errors)
  try {
    await enrichPrivateJob.trigger({
      capture_id: result.data.id,
      workspace_id: session.workspaceId,
    })
  } catch {
    // Trigger.dev not configured in local dev — enrichment will be skipped
  }

  return NextResponse.json(result.data, { status: 201 })
}
