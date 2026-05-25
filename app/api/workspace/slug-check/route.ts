import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase()
  if (!slug) return NextResponse.json({ available: false })

  // Validate slug format: lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(slug)) {
    return NextResponse.json({ available: false, reason: 'Invalid format' })
  }

  const supabase = createServiceClient()

  // Check current slugs
  const { data: current } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (current) return NextResponse.json({ available: false })

  // Check reserved slugs (old slugs from any workspace, including deleted)
  const { data: historical } = await supabase
    .from('workspace_slug_history')
    .select('old_slug')
    .eq('old_slug', slug)
    .maybeSingle()

  return NextResponse.json({ available: !historical })
}
