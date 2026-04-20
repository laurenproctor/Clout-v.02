import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()

  // Verify capture belongs to this workspace
  const { data: capture } = await supabase
    .from('captures')
    .select('workspace_id')
    .eq('id', id)
    .single()

  if (!capture || capture.workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get outputs via generations
  const { data: generations } = await supabase
    .from('generations')
    .select('id')
    .eq('capture_id', id)

  if (!generations || generations.length === 0) {
    return NextResponse.json([])
  }

  const generationIds = generations.map((g) => g.id)

  const { data: outputs, error } = await supabase
    .from('outputs')
    .select('id, title, status, created_at')
    .in('generation_id', generationIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(outputs ?? [])
}
