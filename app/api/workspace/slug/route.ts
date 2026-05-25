import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getWorkspaceSlug } from '@/lib/auth/workspace-context'
import { createServiceClient } from '@/lib/supabase/service'
import { DateTime } from 'luxon'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceSlug = getWorkspaceSlug(req)
  if (!workspaceSlug) return NextResponse.json({ error: 'No workspace context' }, { status: 400 })

  const supabase = createServiceClient()

  // Verify membership and role
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, slug, slug_changed_at')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .single()

  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', session.userId)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Enforce 30-day rate limit
  if (workspace.slug_changed_at) {
    const daysSince = DateTime.now().diff(
      DateTime.fromISO(workspace.slug_changed_at),
      'days'
    ).days
    if (daysSince < 30) {
      const daysLeft = Math.ceil(30 - daysSince)
      return NextResponse.json({
        error: `Slug locked for ${daysLeft} more day${daysLeft === 1 ? '' : 's'}`,
        daysLeft,
      }, { status: 429 })
    }
  }

  const body = await req.json()
  const newSlug = body.slug?.trim().toLowerCase()

  if (!newSlug || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(newSlug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
  }
  if (newSlug === workspace.slug) {
    return NextResponse.json({ error: 'Slug unchanged' }, { status: 400 })
  }

  // Check availability (current + history)
  const { data: taken } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', newSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (taken) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  const { data: reserved } = await supabase
    .from('workspace_slug_history')
    .select('old_slug')
    .eq('old_slug', newSlug)
    .maybeSingle()
  if (reserved) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  // Commit the change
  await supabase.from('workspace_slug_history').insert({
    old_slug: workspace.slug,
    workspace_id: workspace.id,
  })

  await supabase
    .from('workspaces')
    .update({ slug: newSlug, slug_changed_at: new Date().toISOString() })
    .eq('id', workspace.id)

  return NextResponse.json({ slug: newSlug })
}
