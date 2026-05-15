import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listConnections } from '@/lib/publishing/domain'
import type { MediumConnectionMetadata } from '@/lib/publishing/providers/medium/types'
import type { PublishingTarget } from '@/lib/publishing/types/target'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connectionId = req.nextUrl.searchParams.get('connectionId')
  if (!connectionId) return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })

  const connectionsResult = await listConnections(session.workspaceId)
  if (!connectionsResult.ok) {
    return NextResponse.json({ error: connectionsResult.error }, { status: 500 })
  }

  const connection = connectionsResult.data
    .filter(c => c.provider === 'medium')
    .find(c => c.id === connectionId)
  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const meta = connection.metadata as unknown as MediumConnectionMetadata
  const publications: PublishingTarget[] = meta.publications ?? []
  const selected: string | null = meta.selected_publication_id ?? null

  return NextResponse.json({ publications, selected })
}
