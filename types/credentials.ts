// types/credentials.ts

export interface ChannelCredential {
  id: string
  channelId: string
  workspaceId: string
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null      // unix timestamp seconds
  accountId: string | null      // LinkedIn person sub
  accountName: string | null
  accountEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertChannelCredentialInput {
  channelId: string
  workspaceId: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: number | null
  accountId?: string | null
  accountName?: string | null
  accountEmail?: string | null
}

export type PublishStatus = 'success' | 'failed'

export interface PublishLog {
  id: string
  workspaceId: string
  outputId: string
  channelId: string | null
  platform: string
  status: PublishStatus
  providerPostId: string | null
  errorCode: string | null       // machine-readable failure category
  errorMessage: string | null
  wasRetry: boolean
  durationMs: number | null
  createdAt: string
}

export interface CreatePublishLogInput {
  workspaceId: string
  outputId: string
  channelId: string | null
  platform: string
  status: PublishStatus
  providerPostId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  wasRetry?: boolean
  durationMs?: number | null
}
