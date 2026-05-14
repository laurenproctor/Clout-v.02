import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listPublishedOutputs } from '@/lib/domain/output'
import type { ChannelPlatform } from '@/types/domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const platform = searchParams.get('platform') as ChannelPlatform | null
  const since = searchParams.get('since') ?? undefined

  const result = await listPublishedOutputs({
    workspaceId: session.workspaceId,
    platform: platform ?? undefined,
    since,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result.data)
}
