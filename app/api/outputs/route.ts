import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listOutputs, listOutputsByGenerationId } from '@/lib/domain/output'
import type { OutputStatus } from '@/types/domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const generationId = searchParams.get('generation_id')

  if (generationId) {
    const result = await listOutputsByGenerationId({
      generationId,
      workspaceId: session.workspaceId,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json(result.data)
  }

  const status = searchParams.get('status') as OutputStatus | null
  const result = await listOutputs({
    workspaceId: session.workspaceId,
    ...(status && { status }),
    limit: Number(searchParams.get('limit') ?? 50),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}
