import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const generationId = searchParams.get('generation_id')
  if (!generationId) {
    return NextResponse.json({ error: 'generation_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('generations')
    .select('capture_id, workspace_id')
    .eq('id', generationId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (data.workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ capture_id: data.capture_id })
}
