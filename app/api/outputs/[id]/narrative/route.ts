import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { NarrativeRole, NarrativeGoal } from '@/types/calendar'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as {
    narrativeRole?: NarrativeRole
    goal?: NarrativeGoal
    narrativeArcId?: string
    narrativeArcName?: string
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('outputs')
    .update({
      narrative_role: body.narrativeRole ?? null,
      goal: body.goal ?? null,
      narrative_arc_id: body.narrativeArcId ?? null,
      narrative_arc_name: body.narrativeArcName ?? null,
    })
    .eq('id', id)
    .eq('workspace_id', session.workspaceId)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
