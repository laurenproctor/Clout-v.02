import { createGBPClient } from './client'
import type { GBPLocalPost, GBPPostResponse, GBPPublishState } from './types'

// NOTE: The v4 localPosts API is deprecated. Verify current sunset timeline and test against
// a real account before relying on this in production. Google's GBP API documentation does not
// always reflect production behavior.
const MYBUSINESS_V4_BASE = 'https://mybusiness.googleapis.com/v4'

export async function createLocalPost(
  locationName: string,
  accessToken: string,
  post: GBPLocalPost,
): Promise<GBPPostResponse> {
  const client = createGBPClient(accessToken)
  return client.post<GBPPostResponse>(
    `${MYBUSINESS_V4_BASE}/${locationName}/localPosts`,
    post,
  )
}

export function normalizeGBPPostState(state: GBPPostResponse['state']): GBPPublishState {
  switch (state) {
    case 'LIVE':       return 'published'
    case 'REJECTED':   return 'failed'
    case 'PROCESSING': return 'publishing'
  }
}
