import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { publishWordPressOutput, acquirePublishLock, markPublished, markFailed } from '@/lib/domain/publishing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { outputId } = body as { outputId?: string }
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const outputResult = await getOutput(outputId)
  if (!outputResult.ok || outputResult.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  const output = outputResult.data

  if (output.providerPostId) {
    return NextResponse.json({ ok: true, postId: output.providerPostId, alreadyPublished: true })
  }

  const lock = await acquirePublishLock(outputId)
  if (!lock.ok) {
    return NextResponse.json(
      { error: 'Publish already in progress', code: 'publish_in_progress' },
      { status: 409 },
    )
  }

  try {
    const { postId } = await publishWordPressOutput(output)
    await markPublished(outputId, postId)
    return NextResponse.json({ ok: true, postId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed'
    const code = (err as { code?: string }).code ?? 'unknown'
    await markFailed(outputId, message)
    const httpStatus = code === 'token_expired' ? 401 : 502
    return NextResponse.json({ error: message, code }, { status: httpStatus })
  }
}
