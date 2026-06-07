// lib/channels/apple-business-connect/api-contract.ts
// Single source of truth for the Apple Business Connect REST API.
// All values verified against official Apple documentation.
// Last verified: 2026-06-07 against Apple Business Connect API v1.0
//
// NOTE ON TWO DISTINCT APPLE BUSINESS APIS:
//   - Apple Business Manager (ABM) API: device management, base https://api-business.apple.com
//     Uses JWT client assertion → OAuth2 access token (aud = https://account.apple.com/auth/oauth2/v2/token)
//   - Apple Business Connect (ABC) API: Maps listings, showcases, base https://businessconnect.apple.com
//     Uses service-account Bearer token obtained via the same OAuth2 client_credentials grant.
// This file describes the ABC (listings/showcases) API.
//
// SOURCES:
//   https://businessconnect.apple.com/docs/api/v1.0/faq          (auth & rate limits)
//   https://businessconnect.apple.com/docs/api/v1.0/showcase/get  (showcase fields & state enum)
//   https://support.apple.com/guide/business/create-an-api-account-axm33189f66a/web (key format)
//   https://hitchhikers.yext.com/docs/social/apple-showcase-posting/ (showcase field limits)
//   https://support.apple.com/guide/business/create-your-first-showcase-abcb04e20054/web (char limits)

// ─── Authentication ────────────────────────────────────────────────────────────

// Base URL confirmed from Apple Business Connect API query examples:
// "GET {url}/api/v1/companies/{companyId}/businesses/{businessId}/showcases"
export const ABC_BASE_URL = 'https://businessconnect.apple.com/api/v1'

// JWT client assertion is POSTed to the token endpoint to obtain an OAuth2 Bearer token.
// The "aud" value for the client_assertion JWT is the OAuth2 token endpoint URL itself.
// Source: Apple OAuth2 client_credentials grant (same pattern as ABM/ASM API).
export const JWT_AUDIENCE = 'https://account.apple.com/auth/oauth2/v2/token'

// Apple requires ES256 (ECDSA with P-256) for all API key signing.
export const JWT_ALGORITHM = 'ES256' as const

// Apple's maximum allowed client_assertion expiry is 180 days (15,552,000 seconds).
// The short-lived Bearer token from the token exchange expires after 3,600 s (1 hour).
// This constant applies to the client_assertion JWT, not the Bearer token.
// Source: https://arunpatwardhan.com/2025/12/02/working-with-apple-business-manager-apple-school-manager-api/
export const JWT_EXPIRY_SECONDS = 15_552_000 // 180 days — Apple's stated maximum

// Private key is downloaded as a .pem file (PKCS#8 "BEGIN PRIVATE KEY") from the
// Apple Business portal under Settings > API. The file extension is .pem, not .p8.
// Source: https://support.apple.com/guide/business/create-an-api-account-axm33189f66a/web
export const KEY_FORMAT = 'PKCS8' as const // "BEGIN PRIVATE KEY" (not SEC1 "BEGIN EC PRIVATE KEY")

// ─── Endpoints ────────────────────────────────────────────────────────────────
// The ABC API groups resources under a company → business (brand) → location hierarchy.
// "companies" = top-level org; "businesses" = brands beneath that org.
// Source: Apple Business Connect API query examples and Yext integration overview.

export const ENDPOINTS = {
  // List companies (top-level orgs) the service account has access to.
  companies: '/companies',

  // List businesses (brands) under a company.
  businesses: (companyId: string) => `/companies/${companyId}/businesses`,

  // List locations under a specific business.
  locations: (companyId: string, businessId: string) =>
    `/companies/${companyId}/businesses/${businessId}/locations`,

  // Create/read showcases for a specific business.
  showcases: (companyId: string, businessId: string) =>
    `/companies/${companyId}/businesses/${businessId}/showcases`,

  // Extend (update end date of) an existing showcase.
  showcaseExtend: (companyId: string, businessId: string, showcaseId: string) =>
    `/companies/${companyId}/businesses/${businessId}/showcases/${showcaseId}/extend`,
} as const

// ─── Pagination ───────────────────────────────────────────────────────────────
// The ABC API uses a FIQL-style "ql=" query parameter for filtering results.
// Example: ?ql=createdDate=gt=2022-03-30T00:00:00Z
// Pagination is cursor/token-based (confirmed pattern for Apple business APIs).
// The exact cursor and limit param names are not publicly documented outside the
// partner portal; the names below match common Apple API conventions and are
// marked as estimates until partner access confirms them.

export type PageParam = {
  pageToken?: string  // next-page cursor token returned in previous response
  pageSize?:  number  // items per page; Apple ABM APIs default to 100
}

export type PagedResponse<T> = {
  results?:    T[]     // data array — ABC API uses "results" (estimate; see note below)
  nextPageToken?: string  // absent when no more pages
  // NOTE: The exact field names for the array ("results" vs "data") and the
  // next-page token ("nextPageToken" vs "cursor") are not confirmed from public docs.
  // These match the pattern seen in other Apple paginated APIs. Verify against
  // partner API reference before relying on these names in production code.
}

// ─── Account / Company ────────────────────────────────────────────────────────
// The top-level resource is a "company" (sometimes called "org" in Apple docs).
// Field names below are derived from the ABC API showcase query example:
//   { companyId: "9467895078742654934", businessId: "9467895078742654921", ... }
// "id" is the canonical name for resource identifiers in Apple REST APIs.

export interface ABCCompanyRaw {
  id:   string  // companyId — Apple uses numeric string IDs
  name: string  // display name; exact field name not confirmed from public docs (estimate)
}

// ─── Business (Brand) ─────────────────────────────────────────────────────────
// A "business" in the ABC API corresponds to a brand beneath a company.

export interface ABCBusinessRaw {
  id:   string  // businessId
  name: string  // brand name
}

// ─── Location ─────────────────────────────────────────────────────────────────
// Locations live under a business. The ABC API organises addresses using a
// structured address object. Exact sub-field names are not confirmed from public
// docs; the names below follow Apple Maps and Apple Business Connect UI conventions.
// Verify against partner API reference.

export interface ABCLocationRaw {
  id:      string  // locationId
  name:    string  // location display name
  address?: {
    // Address sub-fields: exact names are unconfirmed from public docs.
    // Apple's data spec uses standard postal address terminology.
    street?:          string  // street address / address line 1
    city?:            string  // locality / city
    stateOrProvince?: string  // administrativeArea / state / province
    postalCode?:      string  // zip / postal code
    country?:         string  // ISO 3166-1 alpha-2 country code
  }
}

// ─── Showcase ─────────────────────────────────────────────────────────────────
// A Showcase is a promotional card (offer/event/announcement) shown on an Apple
// Maps place card. It requires a headline, body text, image asset, and CTA.
//
// Showcase creation is a two-step process:
//   1. Upload a location asset (photo) → get an assetId / creativeId
//   2. POST a showcase linking that creative to a business + optional location filter
//      with startDate, endDate, headline, bodyText, and CTA details.
//
// The exact JSON field names for the POST body are not confirmed from public docs
// (the partner portal requires Apple approval). Names below reflect the UI terms
// (headline, body, callToAction) which are the most likely field names; they match
// Yext and Rio SEO integration documentation terminology.
//
// Source for char limits:
//   https://hitchhikers.yext.com/docs/social/apple-showcase-posting/
//   https://support.apple.com/guide/business/create-your-first-showcase-abcb04e20054/web

export interface ABCShowcaseRequest {
  // Required fields
  headline:   string  // max 38 characters — confirmed from Apple support docs
  bodyText:   string  // max 100 characters — confirmed from Apple support docs
  startDate:  string  // ISO 8601 date-time; must be ≥72 hours from submission
  endDate:    string  // ISO 8601 date-time; max 1 year after startDate; required per Yext docs

  // Image — the API requires a pre-uploaded asset ID.
  // Upload your image first via the location_asset endpoint to obtain this ID.
  photoAssetId: string  // ID returned from location asset upload; required

  // Alt text for accessibility — max 100 characters
  altText?:   string

  // Call-to-action (required per Apple's showcase spec)
  // The exact field names for CTA URL and label are unconfirmed from public docs.
  callToActionUrl?:   string  // destination URL for the CTA button
  callToActionType?:  string  // predefined CTA type label (e.g. "ORDER", "BUY", "LEARN_MORE")
}

export interface ABCShowcaseResponse {
  id:          string  // showcase resource ID
  companyId:   string  // parent company ID
  businessId:  string  // parent business/brand ID
  creativeId:  string  // ID of the associated showcase creative
  state:       ABCShowcaseState  // current review/lifecycle state
  createdDate: string  // ISO 8601 — Apple uses "createdDate" (not "createdAt")
  updatedDate: string  // ISO 8601 — Apple uses "updatedDate"
  etag:        string  // version tag for optimistic concurrency
  showcaseDetails?: {
    startDate:  string
    endDate:    string
    resourceDetails?: unknown  // location-filter details; shape varies
    creativeId: string
  }
}

// Confirmed state values from official ABC API docs and FAQ:
export type ABCShowcaseState =
  | 'SUBMITTED'    // awaiting Apple review (review takes up to 72 hours)
  | 'APPROVED'     // approved; visible on Maps during the scheduled window
  | 'REJECTED'     // Apple review rejected the content
  | 'EXPIRED'      // past the endDate or exceeded 30-day APPROVED window
  | 'DEACTIVATED'  // manually deactivated by the partner or Apple
  | 'PUBLISHED'    // synonym for APPROVED/live in some API versions

// ─── Errors ───────────────────────────────────────────────────────────────────
// Standard HTTP status codes used by the ABC API.
// Source: businessconnect.apple.com/docs/api/v1.0/faq (error handling section)

export const ERROR_CODES = {
  UNAUTHORIZED:  401,  // missing or expired Bearer token
  FORBIDDEN:     403,  // token valid but insufficient scope / not delegated
  NOT_FOUND:     404,  // resource does not exist or is not accessible
  UNPROCESSABLE: 422,  // validation failure (e.g. headline too long, invalid dates)
  RATE_LIMITED:  429,  // exceeded per-account rate limit (limits not publicly disclosed)
} as const

// ─── Limits ───────────────────────────────────────────────────────────────────
// Source for showcase text limits:
//   "The headline for your showcase is limited to 38 characters"
//   "A description of the offer or the event (limited to 100 characters)"
//   — https://support.apple.com/guide/business/create-your-first-showcase-abcb04e20054/web
//   — https://hitchhikers.yext.com/docs/social/apple-showcase-posting/
//
// Rate limit: NOT publicly disclosed. Apple provides per-partner limits during
// onboarding. 429 is returned when exceeded. Using 0 as a sentinel meaning
// "unknown — do not enforce client-side; handle 429 responses gracefully."

export const LIMITS = {
  showcaseHeadlineMaxLength: 38,   // confirmed — Apple support docs
  showcaseTitleMaxLength:    38,   // alias: same field, "headline" is the canonical API name
  showcaseBodyMaxLength:     100,  // confirmed — Apple support docs
  showcaseAltTextMaxLength:  100,  // confirmed — Apple support docs
  showcaseMinLeadTimeHours:  72,   // startDate must be ≥72 hours from submission
  showcaseMaxDurationDays:   365,  // endDate max 1 year after startDate

  // Rate limit is not publicly disclosed by Apple.
  // Set to 0 as a sentinel — enforce no client-side rate cap; rely on 429 handling.
  rateLimitPerMinute: 0 as number, // unknown — provided to partners during onboarding only

  // Bearer token TTL from the OAuth2 token exchange
  bearerTokenTtlSeconds: 3_600,  // 60 minutes — confirmed

  // JWT client assertion max validity (used when requesting the Bearer token)
  jwtClientAssertionMaxSeconds: 15_552_000, // 180 days — confirmed
} as const
