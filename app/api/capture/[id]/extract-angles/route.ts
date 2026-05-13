import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCapture } from '@/lib/domain/capture'
import { extractAngles } from '@/lib/ai/generate'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: captureId } = await params

  const captureResult = await getCapture(captureId)
  if (!captureResult.ok) return NextResponse.json({ error: 'Capture not found' }, { status: 404 })

  const capture = captureResult.data
  if (capture.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const content = capture.transcript ?? capture.rawContent ?? ''
  if (!content.trim()) {
    return NextResponse.json({ angles: [] })
  }

  console.log('[angle] extract_started', { capture_id: captureId })

  const angles = await extractAngles(content)

  console.log('[angle] extract_complete', { capture_id: captureId, count: angles.length })

  if (angles.length > 0) {
    const supabase = await createClient()
    await supabase
      .from('captures')
      .update({ extracted_angles: angles as unknown as Json })
      .eq('id', captureId)
  }

  return NextResponse.json({ angles })
}
