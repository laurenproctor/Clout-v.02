// lib/channels/apple-business-connect/showcase.ts
import { createABCClient } from './client'
import { ENDPOINTS, LIMITS } from './api-contract'
import type { ABCShowcaseRequest, ABCShowcaseResponse } from './api-contract'
import type { ABCCredentials } from './types'

export type { ABCShowcaseRequest }

export async function createShowcase(
  creds:      ABCCredentials,
  companyId:  string,
  businessId: string,
  showcase:   ABCShowcaseRequest,
): Promise<ABCShowcaseResponse> {
  if (showcase.headline.length > LIMITS.showcaseTitleMaxLength) {
    throw new Error(`Showcase headline exceeds ${LIMITS.showcaseTitleMaxLength} character limit`)
  }
  if (showcase.bodyText.length > LIMITS.showcaseBodyMaxLength) {
    throw new Error(`Showcase body exceeds ${LIMITS.showcaseBodyMaxLength} character limit`)
  }
  const client = createABCClient(creds)
  return client.post<ABCShowcaseResponse>(ENDPOINTS.showcases(companyId, businessId), showcase)
}
