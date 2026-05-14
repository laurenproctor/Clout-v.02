import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getConnectionWithToken } from '@/lib/publishing/domain'
import { getProvider } from '@/lib/publishing/registry'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const connResult = await getConnectionWithToken(id, session.workspaceId)
  if (!connResult.ok) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 })

  const provider = getProvider(connResult.data.provider)
  const result   = await provider.testConnection(connResult.data)
  return NextResponse.json(result)
}
