import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getEnrichmentForCapture } from '@/lib/domain/private'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const enrichment = await getEnrichmentForCapture(id)

  if (!enrichment) {
    return NextResponse.json(null)
  }
  return NextResponse.json(enrichment)
}
