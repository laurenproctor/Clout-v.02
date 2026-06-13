import { createHmac, timingSafeEqual } from 'crypto'

// Signed correlation token passed to Unipile as the hosted-auth `name`. Unipile
// echoes it back on the notify webhook, letting us bind the connected account to a
// workspace/user. HMAC-signed with OAUTH_STATE_SECRET so the webhook (which is public,
// server-to-server) can't be tricked into binding an account to an arbitrary workspace.
//
// Separate from lib/signed-cookie.ts because the hosted-auth flow needs a longer TTL
// than the 10-minute cookie default (a user may take a while in the LinkedIn wizard).

const LINK_TTL_SECONDS = 30 * 60 // 30 minutes — keep in sync with hosted-auth expiresOn

function secret(): string {
  const s = process.env.OAUTH_STATE_SECRET
  if (!s) throw new Error('OAUTH_STATE_SECRET is not configured')
  return s
}

export interface ConnectorLinkPayload {
  workspaceId: string
  userId: string
}

export function signConnectorToken(payload: ConnectorLinkPayload): string {
  const withExp = { ...payload, exp: Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS }
  const data = Buffer.from(JSON.stringify(withExp)).toString('base64url')
  const sig = createHmac('sha256', secret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyConnectorToken(token: string): ConnectorLinkPayload {
  const dot = token.lastIndexOf('.')
  if (dot === -1) throw new Error('Malformed connector token')

  const data = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', secret()).update(data).digest('base64url')

  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Connector token signature invalid')
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as ConnectorLinkPayload & { exp: number }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Connector token expired')
  }
  return { workspaceId: payload.workspaceId, userId: payload.userId }
}

export const CONNECTOR_LINK_TTL_SECONDS = LINK_TTL_SECONDS
