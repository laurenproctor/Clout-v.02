import { NextRequest, NextResponse } from 'next/server'
import { verifyOAuthState } from '@/lib/oauth-state'
import { getSession } from '@/lib/auth/session'
import { encryptSecret } from '@/lib/security/encryption'
import { createConnection } from '@/lib/publishing/domain'
import { exchangeCodeForToken, verifyShopifyHmac, normalizeShopDomain } from '@/lib/publishing/providers/shopify/oauth'
import { getShopInfo, listBlogs } from '@/lib/publishing/providers/shopify/client'
import { PublishingError } from '@/lib/publishing/errors'

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  const { code, shop, state } = params

  // 1. Verify Shopify HMAC
  if (!verifyShopifyHmac(params)) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/publishing?error=invalid_hmac`
    )
  }

  // 2. Verify state (includes workspaceId)
  let workspaceId: string
  try {
    const payload = verifyOAuthState(state ?? '')
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/publishing?error=invalid_state`
    )
  }

  // 3. Verify session still matches
  const session = await getSession()
  if (!session || session.workspaceId !== workspaceId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/publishing?error=session_mismatch`
    )
  }

  try {
    const shopDomain = normalizeShopDomain(shop ?? '')

    // 4. Exchange code for token
    const { accessToken, scope } = await exchangeCodeForToken(shopDomain, code ?? '')

    // 5. Fetch shop info and blogs in parallel
    const [shopInfo, blogs] = await Promise.all([
      getShopInfo(shopDomain, accessToken),
      listBlogs(shopDomain, accessToken),
    ])

    // 6. Encrypt token + store connection
    const encryptedToken = encryptSecret(accessToken)
    const defaultBlogId  = blogs[0]?.id ?? null

    const result = await createConnection({
      workspaceId,
      userId:               session.userId,
      provider:             'shopify',
      label:                shopInfo.name,
      siteUrl:              shopInfo.primaryDomain.url,
      encryptedAccessToken: encryptedToken,
      metadata: {
        shop_domain:        shopDomain,
        store_name:         shopInfo.name,
        store_id:           shopInfo.id,
        scopes:             scope.split(','),
        oauth_installed_at: new Date().toISOString(),
        default_blog_id:    defaultBlogId,
        available_blogs:    blogs.map(b => ({ id: b.id, title: b.title, handle: b.handle })),
      },
    })

    if (!result.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/publishing?error=connection_failed`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/publishing?connected=shopify`
    )
  } catch (err) {
    const errCode = err instanceof PublishingError ? err.code : 'unknown'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/publishing?error=${encodeURIComponent(errCode)}`
    )
  }
}
