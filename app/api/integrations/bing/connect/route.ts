import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawReturnTo = req.nextUrl.searchParams.get('returnTo')
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') ? rawReturnTo : undefined

  const state = signOAuthState(session.workspaceId, undefined, returnTo)
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/bing/callback`

  const params = new URLSearchParams({
    client_id:     process.env.BING_CLIENT_ID!,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://webmaster.api.bing.com/.default offline_access',
    state,
    response_mode: 'query',
  })

  return NextResponse.redirect(`${MICROSOFT_AUTH_URL}?${params}`)
}
