import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('workspace_id', session.workspaceId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(body.display_name !== undefined && { display_name: body.display_name }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.tone_notes !== undefined && { tone_notes: body.tone_notes }),
      ...(body.industries !== undefined && { industries: body.industries }),
      ...(body.target_audiences !== undefined && { target_audiences: body.target_audiences }),
      ...(body.mental_models !== undefined && { mental_models: body.mental_models }),
      ...(body.philosophies !== undefined && { philosophies: body.philosophies }),
      ...(body.sample_content !== undefined && { sample_content: body.sample_content }),
      ...(body.private_feed_operator_visible !== undefined && {
        private_feed_operator_visible: body.private_feed_operator_visible,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', session.workspaceId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
