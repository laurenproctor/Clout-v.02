import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { checkCaptureLimit } from '@/lib/auth/entitlements'
import { createCapture, listCaptures } from '@/lib/domain/capture'
import type { CaptureSource } from '@/types/domain'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const source: CaptureSource = body.source ?? 'text'
  const validSources: CaptureSource[] = ['text', 'voice', 'structured', 'url']

  if (!validSources.includes(source)) {
    return NextResponse.json({ error: 'Invalid source type' }, { status: 400 })
  }
  const isVoice = source === 'voice'
  if (!body.raw_content && !body.source_url && !(isVoice && body.audio_path)) {
    return NextResponse.json(
      { error: 'raw_content, source_url, or audio_path required' },
      { status: 400 }
    )
  }

  // Check capture limit
  const captureLimit = await checkCaptureLimit(session.workspaceId)
  if (!captureLimit.allowed) {
    return NextResponse.json(
      {
        error: `Monthly capture limit reached (${captureLimit.used}/${captureLimit.limit}). Upgrade your plan for more captures.`,
        code: 'CAPTURE_LIMIT_EXCEEDED',
      },
      { status: 402 }
    )
  }

  const result = await createCapture({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    source,
    rawContent: body.raw_content ?? null,
    sourceUrl: body.source_url ?? null,
    audioPath: body.audio_path ?? null,
    structuredData: body.structured_data ?? null,
    isPrivate: body.is_private ?? false,
    tags: body.tags ?? [],
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const isPrivate = searchParams.get('private') === 'true' ? true
    : searchParams.get('private') === 'false' ? false
    : undefined

  const result = await listCaptures({
    workspaceId: session.workspaceId,
    isPrivate,
    limit: Number(searchParams.get('limit') ?? 50),
    offset: Number(searchParams.get('offset') ?? 0),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data)
}
