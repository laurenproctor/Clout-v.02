// app/api/channels/linkedin/connect/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildLinkedInAuthUrl } from '@/lib/linkedin'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/linkedin/callback`
  const state = signOAuthState(session.workspaceId)

  return NextResponse.redirect(buildLinkedInAuthUrl(redirectUri, state))
}
