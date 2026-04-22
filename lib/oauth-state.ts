// lib/oauth-state.ts
import { createHmac, timingSafeEqual } from 'crypto'

const STATE_TTL_SECONDS = 600 // 10 minutes

interface StatePayload {
  workspaceId: string
  nonce: string
  exp: number
}

function secret(): string {
  const s = process.env.OAUTH_STATE_SECRET
  if (!s) throw new Error('OAUTH_STATE_SECRET is not configured')
  return s
}

export function signOAuthState(workspaceId: string): string {
  const payload: StatePayload = {
    workspaceId,
    nonce: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig  = createHmac('sha256', secret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyOAuthState(state: string): StatePayload {
  const dot = state.lastIndexOf('.')
  if (dot === -1) throw new Error('Malformed state token')

  const data = state.slice(0, dot)
  const sig  = state.slice(dot + 1)

  const expected = createHmac('sha256', secret()).update(data).digest('base64url')

  // Timing-safe comparison prevents timing attacks
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('State signature invalid')
  }

  const payload: StatePayload = JSON.parse(Buffer.from(data, 'base64url').toString())

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('State token expired')
  }

  return payload
}
