export type RetryCategory =
  | 'network'
  | 'rate_limit'
  | 'provider_outage'
  | 'auth'
  | 'validation'

export class PublishingError extends Error {
  code:           string
  retryable:      boolean
  // Operational metadata — set by provider clients when available
  provider?:      string          // which provider threw
  providerCode?:  string          // provider's internal error code
  requestId?:     string          // provider request tracing ID — for support debugging
  retryAfter?:    number          // seconds until retry (from Retry-After header)
  retryCategory?: RetryCategory   // classification for worker routing + analytics

  constructor(message: string, code: string, retryable: boolean = false) {
    super(message)
    this.name      = 'PublishingError'
    this.code      = code
    this.retryable = retryable
  }
}

export const PUB_ERROR = {
  AUTH_FAILED:                  'auth_failed',
  INVALID_URL:                  'invalid_url',
  CONNECTION_REFUSED:           'connection_refused',
  PUBLISH_FAILED:               'publish_failed',
  UPDATE_FAILED:                'update_failed',
  DELETE_FAILED:                'delete_failed',
  REST_NOT_ENABLED:             'rest_not_enabled',
  MALFORMED_CONTENT:            'malformed_content',
  RATE_LIMITED:                 'rate_limited',
  NETWORK_ERROR:                'network_error',
  NOT_FOUND:                    'not_found',
  DUPLICATE_PUBLISH:            'duplicate_publish',
  SHOPIFY_HMAC_FAILED:          'shopify_hmac_failed',
  SHOPIFY_SCOPE_MISSING:        'shopify_scope_missing',
  SHOPIFY_BLOG_NOT_FOUND:       'shopify_blog_not_found',
  MEDIUM_PUBLICATION_NOT_FOUND: 'medium_publication_not_found',
  MEDIUM_NOT_CONTRIBUTOR:       'medium_not_contributor',
  MEDIUM_INVALID_TOKEN:         'medium_invalid_token',
  MEDIUM_UPDATE_NOT_SUPPORTED:  'medium_update_not_supported',
  MEDIUM_DELETE_NOT_SUPPORTED:  'medium_delete_not_supported',
} as const

export type PubErrorCode = (typeof PUB_ERROR)[keyof typeof PUB_ERROR]

export function classifyMediumError(
  status: number,
  errors?: Array<{ message: string; code: number }>,
): { code: PubErrorCode; retryable: boolean; retryCategory: RetryCategory } {
  void errors
  if (status === 401) return { code: PUB_ERROR.MEDIUM_INVALID_TOKEN, retryable: false, retryCategory: 'auth' }
  if (status === 403) return { code: PUB_ERROR.MEDIUM_NOT_CONTRIBUTOR, retryable: false, retryCategory: 'auth' }
  if (status === 404) return { code: PUB_ERROR.NOT_FOUND, retryable: false, retryCategory: 'validation' }
  if (status === 429) return { code: PUB_ERROR.RATE_LIMITED, retryable: true, retryCategory: 'rate_limit' }
  if (status >= 500)  return { code: PUB_ERROR.PUBLISH_FAILED, retryable: true, retryCategory: 'provider_outage' }
  return { code: PUB_ERROR.PUBLISH_FAILED, retryable: false, retryCategory: 'validation' }
}

export function classifyWordPressError(
  status: number,
  code?: string,
): { code: PubErrorCode; retryable: boolean; retryCategory: RetryCategory } {
  if (status === 401 || status === 403 || code === 'rest_forbidden' || code === 'rest_cannot_create') {
    return { code: PUB_ERROR.AUTH_FAILED, retryable: false, retryCategory: 'auth' }
  }
  if (status === 404)   return { code: PUB_ERROR.NOT_FOUND,      retryable: false, retryCategory: 'validation' }
  if (status === 429)   return { code: PUB_ERROR.RATE_LIMITED,   retryable: true,  retryCategory: 'rate_limit' }
  if (status >= 500)    return { code: PUB_ERROR.PUBLISH_FAILED, retryable: true,  retryCategory: 'provider_outage' }
  return { code: PUB_ERROR.PUBLISH_FAILED, retryable: false, retryCategory: 'validation' }
}
