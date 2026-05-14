import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildGBPAuthUrl } from '@/lib/channels/google-business-profile/auth'
import { signOAuthState } from '@/lib/oauth-state'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${APP_URL()}/api/channels/google-business-profile/callback`
  const state = signOAuthState(session.workspaceId)

  return NextResponse.redirect(buildGBPAuthUrl(redirectUri, state))
}
