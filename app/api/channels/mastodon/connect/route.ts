import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'
import {
  normalizeInstanceUrl,
  getOrRegisterApp,
  buildMastodonAuthUrl,
  getRedirectUri,
} from '@/lib/mastodon'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const instance = req.nextUrl.searchParams.get('instance')
  if (!instance) return NextResponse.json({ error: 'instance is required' }, { status: 400 })

  let instanceUrl: string
  try {
    instanceUrl = normalizeInstanceUrl(instance)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(
      `${APP_URL()}/settings/publishing?error=mastodon_registration_failed&detail=${encodeURIComponent(msg)}`
    )
  }

  const redirectUri = getRedirectUri()

  let clientId: string
  try {
    const app = await getOrRegisterApp(instanceUrl, redirectUri)
    clientId = app.clientId
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mastodon] app registration failed', { instanceUrl, err })
    return NextResponse.redirect(
      `${APP_URL()}/settings/publishing?error=mastodon_registration_failed&detail=${encodeURIComponent(msg)}`
    )
  }

  const state = signOAuthState(session.workspaceId, undefined, undefined, instanceUrl)
  const authUrl = buildMastodonAuthUrl(instanceUrl, clientId, redirectUri, state)

  return NextResponse.redirect(authUrl)
}
