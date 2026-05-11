// app/api/channels/linkedin/connect/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildLinkedInAuthUrl } from '@/lib/linkedin'
import { signOAuthState } from '@/lib/oauth-state'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/linkedin/callback`
  const state = signOAuthState(session.workspaceId)

  // If a LinkedIn channel already exists, force re-login so the user can
  // authenticate as a different LinkedIn account instead of silently reusing
  // the browser's current LinkedIn session.
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('workspace_id', session.workspaceId)
    .eq('platform', 'linkedin')
    .limit(1)
    .maybeSingle()

  return NextResponse.redirect(
    buildLinkedInAuthUrl(redirectUri, state, { forceLogin: !!existing })
  )
}
