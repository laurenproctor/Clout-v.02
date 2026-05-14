// lib/publishing/providers/shopify/oauth.ts
// Shopify OAuth 2.0 helpers.
// Scopes: write_content read_content
// HMAC verification: Shopify signs callback params with HMAC-SHA256 of sorted params.
// TODO: support token refresh lifecycle if Shopify changes OAuth model — tokens are
// currently long-lived offline tokens, but that is not guaranteed permanently.
// When implementing refresh: update encryptedAccessToken in place + call recordConnectionSuccess.
import { createHmac, timingSafeEqual } from 'crypto'
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'

const SCOPES = 'write_content,read_content'
const API_VERSION = '2024-10'

export function buildShopifyAuthUrl(
  shopDomain: string,
  redirectUri: string,
  state: string,
): string {
  const shop = normalizeShopDomain(shopDomain)
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_CLIENT_ID!,
    scope:        SCOPES,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user',
  })
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForToken(
  shopDomain: string,
  code: string,
): Promise<{ accessToken: string; scope: string }> {
  const shop = normalizeShopDomain(shopDomain)
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  if (!res.ok) {
    throw new PublishingError(
      `Shopify token exchange failed (${res.status})`,
      PUB_ERROR.AUTH_FAILED, false,
    )
  }

  const data = await res.json() as { access_token?: string; scope?: string; error?: string }
  if (!data.access_token) {
    throw new PublishingError(
      data.error ?? 'Shopify did not return an access token.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }

  return { accessToken: data.access_token, scope: data.scope ?? '' }
}

// Shopify signs callback query params (excluding hmac itself) with HMAC-SHA256.
// Sort params alphabetically, join as key=value&key=value, then compare.
export function verifyShopifyHmac(
  params: Record<string, string>,
  secret: string = process.env.SHOPIFY_CLIENT_SECRET!,
): boolean {
  const { hmac, ...rest } = params
  if (!hmac) return false

  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&')

  const digest = createHmac('sha256', secret).update(message).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(hmac, 'hex'))
  } catch {
    return false
  }
}

// Normalize to "store.myshopify.com" — accept various input formats.
export function normalizeShopDomain(input: string): string {
  const clean = input
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .trim()

  // If it's already a myshopify.com domain, return as-is
  if (clean.endsWith('.myshopify.com')) return clean

  // Treat as store name, append .myshopify.com
  const storeName = clean.replace(/\..*$/, '')
  return `${storeName}.myshopify.com`
}

export function shopifyApiUrl(shopDomain: string): string {
  return `https://${normalizeShopDomain(shopDomain)}/admin/api/${API_VERSION}/graphql.json`
}
