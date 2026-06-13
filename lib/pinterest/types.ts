// lib/pinterest/types.ts
// Server-side only. Pinterest API v5: https://developers.pinterest.com/docs/api/v5/

export interface PinterestTokens {
  access_token: string
  refresh_token: string
  /** Access token lifetime in seconds (~30 days). */
  expires_in: number
  /** Refresh token lifetime in seconds (~1 year). */
  refresh_token_expires_in?: number
  scope?: string
  token_type?: string
}

export interface PinterestProfile {
  /** v5 user_account exposes username as the stable identifier (no numeric id). */
  username: string
  accountType?: string
  profileImageUrl?: string | null
  websiteUrl?: string | null
}

export interface PinterestBoard {
  id: string
  name: string
  privacy?: string
  /** Pinterest does not return a canonical board URL on /v5/boards; derived if absent. */
  url?: string | null
}

export interface PinterestPin {
  id: string
}

/** Carries the HTTP status + a stable code so callers can classify (mirrors GBPApiError). */
export class PinterestApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = 'pinterest_api_error',
  ) {
    super(message)
    this.name = 'PinterestApiError'
  }
}
