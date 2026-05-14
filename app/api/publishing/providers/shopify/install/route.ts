import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'
import { buildShopifyAuthUrl, normalizeShopDomain } from '@/lib/publishing/providers/shopify/oauth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shop = req.nextUrl.searchParams.get('shop')
  if (!shop) return NextResponse.json({ error: 'shop parameter is required.' }, { status: 400 })

  const shopDomain  = normalizeShopDomain(shop)
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/publishing/providers/shopify/callback`
  const state       = signOAuthState(session.workspaceId)
  const authUrl     = buildShopifyAuthUrl(shopDomain, redirectUri, state)

  return NextResponse.redirect(authUrl)
}
