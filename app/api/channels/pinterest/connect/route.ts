import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FEATURES } from '@/lib/features'
import { buildPinterestAuthUrl } from '@/lib/pinterest/oauth'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  if (!FEATURES.pinterestPublishing) {
    return NextResponse.json({ error: 'Pinterest publishing is not enabled.' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/pinterest/callback`
  const state = signOAuthState(session.workspaceId)

  return NextResponse.redirect(buildPinterestAuthUrl(redirectUri, state))
}
