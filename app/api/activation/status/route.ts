import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getActivationStatus } from '@/lib/domain/activation'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getActivationStatus(session.workspaceId)
  return NextResponse.json(status)
}
