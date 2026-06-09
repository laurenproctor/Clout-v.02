import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { updateGenerationBehavior } from '@/lib/visual/telemetry/track'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['userDownloaded', 'userPublished', 'userRegenerated', 'userDiscarded']
  const behavior: Record<string, boolean> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'boolean') behavior[key] = body[key] as boolean
  }

  if (Object.keys(behavior).length === 0) {
    return NextResponse.json({ error: 'No valid behavior fields provided' }, { status: 400 })
  }

  await updateGenerationBehavior(imageId, session.workspaceId, behavior as Parameters<typeof updateGenerationBehavior>[2])

  return NextResponse.json({ ok: true })
}
