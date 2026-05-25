import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/workspaces — list all workspaces the authenticated user belongs to
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, plan, avatar_url, brand_color)')
    .eq('user_id', session.userId)
    .order('joined_at', { ascending: true })

  const workspaces = (memberships ?? []).map((m) => {
    const ws = m.workspaces as {
      id: string; name: string; slug: string; plan: string
      avatar_url: string | null; brand_color: string | null
    }
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      plan: ws.plan,
      avatarUrl: ws.avatar_url,
      brandColor: ws.brand_color,
      role: m.role,
    }
  })

  return NextResponse.json({ workspaces })
}

// POST /api/workspaces — create a new workspace
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = body.name?.trim()
  const slug = body.slug?.trim().toLowerCase()

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug required' }, { status: 400 })
  }
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check slug availability
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  const { data: reserved } = await supabase
    .from('workspace_slug_history')
    .select('old_slug')
    .eq('old_slug', slug)
    .maybeSingle()
  if (reserved) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  // Create workspace
  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select('id, name, slug, plan')
    .single()
  if (wsErr || !workspace) {
    return NextResponse.json({ error: wsErr?.message ?? 'Failed to create' }, { status: 500 })
  }

  // Add as owner
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: session.userId,
    role: 'owner',
  })

  // Create empty profile and free subscription
  await Promise.all([
    supabase.from('profiles').insert({ workspace_id: workspace.id }),
    supabase.from('subscriptions').insert({
      workspace_id: workspace.id,
      plan: 'free',
      status: 'trialing',
    }),
  ])

  return NextResponse.json({ workspace }, { status: 201 })
}
