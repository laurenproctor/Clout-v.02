export class PublishingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'PublishingError'
  }
}

export const PUB_ERROR = {
  AUTH_FAILED:         'auth_failed',
  INVALID_URL:         'invalid_url',
  CONNECTION_REFUSED:  'connection_refused',
  PUBLISH_FAILED:      'publish_failed',
  UPDATE_FAILED:       'update_failed',
  DELETE_FAILED:       'delete_failed',
  REST_NOT_ENABLED:    'rest_not_enabled',
  MALFORMED_CONTENT:   'malformed_content',
  RATE_LIMITED:        'rate_limited',
  NETWORK_ERROR:       'network_error',
  NOT_FOUND:           'not_found',
  DUPLICATE_PUBLISH:   'duplicate_publish',
} as const

export type PubErrorCode = (typeof PUB_ERROR)[keyof typeof PUB_ERROR]

export function classifyWordPressError(
  status: number,
  code?: string,
): { code: PubErrorCode; retryable: boolean } {
  if (status === 401 || status === 403 || code === 'rest_forbidden' || code === 'rest_cannot_create') {
    return { code: PUB_ERROR.AUTH_FAILED, retryable: false }
  }
  if (status === 404)   return { code: PUB_ERROR.NOT_FOUND,      retryable: false }
  if (status === 429)   return { code: PUB_ERROR.RATE_LIMITED,   retryable: true  }
  if (status >= 500)    return { code: PUB_ERROR.PUBLISH_FAILED, retryable: true  }
  return { code: PUB_ERROR.PUBLISH_FAILED, retryable: false }
}
