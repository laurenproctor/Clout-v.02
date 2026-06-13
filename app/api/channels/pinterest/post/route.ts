import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FEATURES } from '@/lib/features'
import { getOutput } from '@/lib/domain/output'
import { publishPinterestOutput, acquirePublishLock, markPublished, markFailed } from '@/lib/domain/publishing'
import { pinterestPinUrl } from '@/lib/pinterest/client'
import { pinterestErrorMessage } from '@/lib/pinterest/messages'

export async function POST(req: NextRequest) {
  if (!FEATURES.pinterestPublishing) {
    return NextResponse.json({ error: 'Pinterest publishing is not enabled.' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { outputId } = (await req.json()) as { outputId?: string }
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const outputResult = await getOutput(outputId)
  if (!outputResult.ok || outputResult.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  const output = outputResult.data

  if (output.providerPostId) {
    return NextResponse.json({
      ok: true,
      pinId: output.providerPostId,
      pinUrl: output.providerPostUrl ?? pinterestPinUrl(output.providerPostId),
      alreadyPublished: true,
    })
  }

  // Caller owns the lock + status transitions; publishPinterestOutput is lock-free.
  const lock = await acquirePublishLock(outputId)
  if (!lock.ok) {
    return NextResponse.json(
      { error: 'Publish already in progress', code: 'publish_in_progress' },
      { status: 409 },
    )
  }

  try {
    const { pinId } = await publishPinterestOutput(output)
    const pinUrl = pinterestPinUrl(pinId)
    await markPublished(outputId, pinId, pinUrl)
    return NextResponse.json({ ok: true, pinId, pinUrl })
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown'
    const message = err instanceof Error ? err.message : 'Publish failed'
    await markFailed(outputId, message)
    // Readiness/known codes map to friendly copy; surface as 400, auth as 401, else 502.
    const friendly = pinterestErrorMessage(code)
    const httpStatus = code === 'missing_credentials' ? 401
      : friendly !== 'This Pin isn’t ready to publish yet.' ? 400
      : 502
    return NextResponse.json({ error: friendly, code, detail: message }, { status: httpStatus })
  }
}
