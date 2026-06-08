import { Agent } from '@atproto/api'
import { getOAuthClient } from './oauth-client'

export async function restoreAgent(did: string): Promise<Agent> {
  const client = getOAuthClient()
  try {
    const session = await client.restore(did)
    return new Agent(session)
  } catch (err) {
    console.error('[bluesky] OAuth restore failed', {
      did,
      reason: err instanceof Error ? err.message : String(err),
    })
    throw Object.assign(
      new Error('BlueSky session expired or revoked. Please reconnect your account.'),
      { code: 'token_expired', retryable: false, cause: err }
    )
  }
}
