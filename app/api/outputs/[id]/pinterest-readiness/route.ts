import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { validatePinterestReadiness } from '@/lib/pinterest/readiness'

// Lightweight (default) or strict readiness for an output, used to drive Studio inline
// state and gate Move-to-Ready / Schedule. The publish path re-runs strict server-side.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await getOutput(id)
  if (!result.ok || result.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const mode = req.nextUrl.searchParams.get('mode') === 'strict' ? 'strict' : 'lightweight'
  const readiness = await validatePinterestReadiness(result.data, { mode })
  return NextResponse.json(readiness)
}
