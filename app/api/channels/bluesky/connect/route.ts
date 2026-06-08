import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'
import { getOAuthClient } from '@/lib/bluesky/oauth-client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const handle = req.nextUrl.searchParams.get('handle')
  if (!handle) return NextResponse.json({ error: 'handle is required' }, { status: 400 })

  const state   = signOAuthState(session.workspaceId)
  const client  = getOAuthClient()

  let authUrl: URL
  try {
    authUrl = await client.authorize(handle.replace(/^@/, ''), { state })
  } catch (err) {
    console.error('[bluesky] authorize failed', { handle, err })
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
    return NextResponse.redirect(
      `${APP_URL}/settings/publishing?error=bluesky_handle_not_found`
    )
  }

  const res = NextResponse.redirect(authUrl.toString())
  res.cookies.set('bs_workspace', session.workspaceId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })
  return res
}
