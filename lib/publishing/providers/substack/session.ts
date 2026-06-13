import { decryptSecret, encryptSecret } from '@/lib/security/encryption'
import { createServiceClient } from '@/lib/supabase/service'
import { authenticate, SubstackAuthError } from './client'
import type { ProviderConnection } from '@/lib/publishing/types'

export const SESSION_TTL_DAYS = 30

function sessionIsStale(sessionObtainedAt: string | undefined): boolean {
  if (!sessionObtainedAt) return true
  const obtainedAt = new Date(sessionObtainedAt).getTime()
  const ttlMs      = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - obtainedAt > ttlMs
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeBackSession(
  connectionId:    string,
  newCookie:       string,
  currentMetadata: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient()
  const now      = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('publishing_connections')
    .update({
      encrypted_access_token: encryptSecret(newCookie),
      metadata:               { ...currentMetadata, session_obtained_at: now },
      updated_at:             now,
    })
    .eq('id', connectionId)
}

async function renewSession(connection: ProviderConnection): Promise<string> {
  const encryptedPassword = connection.metadata['encrypted_password'] as string | undefined
  if (!encryptedPassword) {
    throw new SubstackAuthError(
      'Session expired and no stored credentials found. Please reconnect your Substack account.',
    )
  }

  const email    = connection.metadata['email'] as string
  const password = decryptSecret(encryptedPassword)
  const newCookie = await authenticate(email, password)

  // Fire-and-forget — session renewal must not block the publish request
  writeBackSession(connection.id, newCookie, connection.metadata).catch(err => {
    console.error('[substack/session] Failed to write back renewed session:', err)
  })

  return newCookie
}

export async function getActiveSession(connection: ProviderConnection): Promise<string> {
  const sessionObtainedAt = connection.metadata['session_obtained_at'] as string | undefined

  if (!sessionIsStale(sessionObtainedAt)) {
    return decryptSecret(connection.encryptedAccessToken)
  }

  return renewSession(connection)
}

// Force a single re-authentication regardless of staleness. Used by the provider when a
// live call returns an auth failure on a session we believed was fresh — attempt renewal
// exactly once before failing closed. Throws SubstackAuthError if renewal is impossible.
export async function forceRenewSession(connection: ProviderConnection): Promise<string> {
  return renewSession(connection)
}
