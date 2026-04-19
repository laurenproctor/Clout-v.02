import type { Capture, PrivateEnrichment } from '@/types/domain'

export async function getPrivateFeed(params: {
  workspaceId: string
  createdBy: string
  tags?: string[]
  limit?: number
  offset?: number
}): Promise<Capture[]> {
  throw new Error('not implemented')
}

export async function getEnrichedFeed(params: {
  workspaceId: string
  createdBy: string
  tags?: string[]
}): Promise<PrivateEnrichment[]> {
  throw new Error('not implemented')
}

export async function getEnrichmentForCapture(
  captureId: string
): Promise<PrivateEnrichment | null> {
  throw new Error('not implemented')
}

export async function updatePrivateFeedVisibility(params: {
  workspaceId: string
  visible: boolean
}): Promise<void> {
  throw new Error('not implemented')
}
