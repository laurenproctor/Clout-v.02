import { createHmac, timingSafeEqual } from 'crypto'

// Deterministic per-workspace feed token — no DB storage needed.
// Derived from workspace ID + server secret. Revocable by rotating FEED_SECRET.
// URL format: /api/feeds/rss?w=[workspaceId]&t=[token]

function secret(): string {
  const s = process.env.FEED_SECRET ?? process.env.OAUTH_STATE_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('FEED_SECRET (or OAUTH_STATE_SECRET) must be set to generate feed tokens.')
  return s
}

export function generateFeedToken(workspaceId: string): string {
  return createHmac('sha256', secret()).update(workspaceId).digest('hex').slice(0, 32)
}

export function verifyFeedToken(workspaceId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateFeedToken(workspaceId), 'hex')
    const received = Buffer.from(token, 'hex')
    if (expected.length !== received.length) return false
    return timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
