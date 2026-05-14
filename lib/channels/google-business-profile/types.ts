export interface GBPAccount {
  name: string         // "accounts/123456"
  accountName: string  // business display name
  type: string         // LOCATION_GROUP | PERSONAL | USER_GROUP | etc.
}

export interface GBPLocationAddress {
  addressLines: string[]
  locality: string           // city
  administrativeArea: string // state/province
  regionCode: string         // ISO 3166-1 alpha-2
}

export interface GBPLocation {
  name: string                     // "accounts/123/locations/456" — canonical API resource path
  title: string                    // business name at this location
  storefrontAddress?: GBPLocationAddress
  metadata?: {
    mapsUri?: string
    newReviewUri?: string
  }
  profile?: {
    description?: string
  }
  isVerified?: boolean
  profilePhotoUrl?: string
}

export interface GBPLocalPost {
  summary: string   // main text content (≤1500 chars)
  topicType: GBPPostTopicType
  callToAction?: GBPCallToAction
}

export type GBPPostTopicType = 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT'

export interface GBPCallToAction {
  actionType: 'LEARN_MORE' | 'BOOK' | 'ORDER' | 'SHOP' | 'SIGN_UP' | 'CALL'
  url?: string
}

export interface GBPPostResponse {
  name: string   // "accounts/123/locations/456/localPosts/789"
  state: 'LIVE' | 'REJECTED' | 'PROCESSING'
  createTime: string
  updateTime: string
}

export interface GBPTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

// Normalized internal publish states
export type GBPPublishState = 'published' | 'failed' | 'publishing'

// Normalized internal error codes
export type GBPErrorCode =
  | 'quota_exceeded'
  | 'insufficient_permissions'
  | 'location_suspended'
  | 'listing_disabled'
  | 'unverified_business'
  | 'moderation_rejection'
  | 'publish_error'

export class GBPTokenExpiredError extends Error {
  constructor() {
    super('GBP access token expired')
    this.name = 'GBPTokenExpiredError'
  }
}

export class GBPApiError extends Error {
  constructor(
    public readonly code: GBPErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GBPApiError'
  }
}
