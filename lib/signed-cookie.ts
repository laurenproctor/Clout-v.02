// lib/signed-cookie.ts
// Signs and verifies JSON cookie payloads with HMAC-SHA256.
// Reuses OAUTH_STATE_SECRET — both are server-side transient tokens.
import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_TTL_SECONDS = 600 // 10 minutes

function secret(): string {
  const s = process.env.OAUTH_STATE_SECRET
  if (!s) throw new Error('OAUTH_STATE_SECRET is not configured')
  return s
}

export function signCookiePayload<T extends object>(payload: T): string {
  const withExp = { ...payload, exp: Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS }
  const data = Buffer.from(JSON.stringify(withExp)).toString('base64url')
  const sig  = createHmac('sha256', secret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyCookiePayload<T extends object>(token: string): T & { exp: number } {
  const dot = token.lastIndexOf('.')
  if (dot === -1) throw new Error('Malformed cookie token')

  const data = token.slice(0, dot)
  const sig  = token.slice(dot + 1)

  const expected = createHmac('sha256', secret()).update(data).digest('base64url')
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Cookie signature invalid')
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as T & { exp: number }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Cookie token expired')
  }

  return payload
}
