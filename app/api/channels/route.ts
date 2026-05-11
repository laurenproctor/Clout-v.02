import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: channels } = await supabase
    .from('channels')
    .select()
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: true })

  if (!channels?.length) return NextResponse.json([])

  // Fetch token expiry from credentials (service client — tokens are server-only)
  const service = createServiceClient()
  const { data: creds } = await service
    .from('channel_credentials')
    .select('channel_id, expires_at')
    .in('channel_id', channels.map(c => c.id))

  const expiryMap = new Map((creds ?? []).map(c => [c.channel_id, c.expires_at]))

  return NextResponse.json(
    channels.map(c => ({ ...c, token_expires_at: expiryMap.get(c.id) ?? null }))
  )
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { platform, label, config } = body

  const validPlatforms = ['linkedin', 'newsletter', 'twitter', 'threads', 'facebook', 'instagram', 'tiktok']
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const supabase = await createClient()

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

  if (error) {
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(data, { status: 201 })
}
