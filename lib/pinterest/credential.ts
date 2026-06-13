// lib/pinterest/credential.ts
// Resolves a valid Pinterest access token for a channel, refreshing + persisting if
// expired. Shared by board sync and the publisher so refresh logic lives in one place.
import { getChannelCredential, isTokenExpired, upsertChannelCredential } from '@/lib/domain/credentials'
import { refreshPinterestToken } from './oauth'
import { PinterestApiError } from './types'

export async function getValidPinterestToken(
  channelId: string,
  workspaceId: string,
): Promise<string> {
  const credResult = await getChannelCredential(channelId)
  if (!credResult.ok) {
    throw new PinterestApiError('Pinterest account not connected.', 401, 'missing_credentials')
  }
  const cred = credResult.data

  if (!isTokenExpired(cred.expiresAt)) return cred.accessToken

  if (!cred.refreshToken) {
    throw new PinterestApiError('Pinterest session expired. Please reconnect.', 401, 'missing_credentials')
  }

  const refreshed = await refreshPinterestToken(cred.refreshToken)
  const upsert = await upsertChannelCredential({
    channelId,
    workspaceId,
    accessToken:  refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? cred.refreshToken,
    expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
    accountId:    cred.accountId,
    accountName:  cred.accountName,
    accountEmail: cred.accountEmail,
  })
  if (!upsert.ok) throw new PinterestApiError('Failed to store refreshed Pinterest token.', 500, 'missing_credentials')
  return upsert.data.accessToken
}
