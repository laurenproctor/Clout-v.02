import { NextRequest, NextResponse } from 'next/server'
import { verifyOAuthState } from '@/lib/oauth-state'
import { getSession } from '@/lib/auth/session'
import { encryptSecret } from '@/lib/security/encryption'
import { createConnection } from '@/lib/publishing/domain'
import { exchangeMediumCode } from '@/lib/publishing/providers/medium/oauth'
import { MediumClient } from '@/lib/publishing/providers/medium/client'
import { buildTargetId, normalizeTargetType } from '@/lib/publishing/types/target'
import { PublishingError } from '@/lib/publishing/errors'
import type { PublishingTarget } from '@/lib/publishing/types/target'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // User denied the OAuth request
  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=access_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=invalid_callback`)
  }

  // 1. Verify state (includes workspaceId)
  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId   = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=invalid_state`)
  }

  // 2. Verify session still matches
  const session = await getSession()
  if (!session || session.workspaceId !== workspaceId) {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=session_mismatch`)
  }

  try {
    const redirectUri = `${APP_URL}/api/publishing/providers/medium/callback`

    // 3. Exchange code for tokens
    const tokens = await exchangeMediumCode(code, redirectUri)

    // 4. Fetch user profile, then publications (publications require real userId)
    const client = new MediumClient(tokens.accessToken)
    const user = await client.getUser()
    // publications are optional — not all Medium accounts have contributor access
    const userPublications = await client.getPublications(user.id).catch(() => [])

    // 5. Map publications to PublishingTarget[] (deterministic IDs)
    const targets: PublishingTarget[] = userPublications.map(pub => ({
      id:             buildTargetId('medium', pub.id),
      provider:       'medium' as const,
      externalId:     pub.id,
      label:          pub.name,
      type:           normalizeTargetType('publication'),
      targetCategory: 'owned' as const,
      url:            pub.url,
      metadata:       { tagline: pub.tagline, imageUrl: pub.imageUrl },
    }))

    // 6. Encrypt access token + store connection
    const encryptedAccessToken = encryptSecret(tokens.accessToken)
    const encryptedRefreshToken = encryptSecret(tokens.refreshToken)

    const result = await createConnection({
      workspaceId,
      userId:   session.userId,
      provider: 'medium',
      label:    user.name || user.username,
      siteUrl:  user.url,
      encryptedAccessToken,
      metadata: {
        medium_user_id:          user.id,
        medium_username:         user.username,
        medium_name:             user.name,
        medium_url:              user.url,
        medium_image_url:        user.imageUrl,
        publications:            targets,
        selected_publication_id: targets[0]?.externalId ?? null,
        scopes:                  tokens.scopes,
        oauth_connected_at:      new Date().toISOString(),
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at:        tokens.expiresAt,
      },
    })

    if (!result.ok) {
      return NextResponse.redirect(`${APP_URL}/settings/publishing?error=connection_failed`)
    }

    return NextResponse.redirect(`${APP_URL}/settings/publishing?connected=medium`)
  } catch (err) {
    const errCode = err instanceof PublishingError ? err.code : 'unknown'
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=${encodeURIComponent(errCode)}`)
  }
}
