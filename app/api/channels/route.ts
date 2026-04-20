import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('channels')
    .select()
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { platform, label, config } = body

  const validPlatforms = ['linkedin', 'newsletter', 'twitter']
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const supabase = await createClient()

  // Only one channel per platform per workspace
  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('workspace_id', session.workspaceId)
    .eq('platform', platform)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Channel already exists for this platform' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: session.workspaceId,
      platform,
      label: label?.trim() || null,
      config: config ?? {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
