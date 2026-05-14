import { GBPTokenExpiredError, GBPApiError } from './types'
import type { GBPErrorCode } from './types'

function classifyError(status: number, body: string): GBPErrorCode {
  if (status === 429) return 'quota_exceeded'
  if (status === 403) {
    if (body.includes('PERMISSION_DENIED')) return 'insufficient_permissions'
    return 'insufficient_permissions'
  }
  if (body.includes('SUSPENDED_LOCATION'))   return 'location_suspended'
  if (body.includes('DISABLED_LISTING'))     return 'listing_disabled'
  if (body.includes('UNVERIFIED_BUSINESS'))  return 'unverified_business'
  if (body.includes('CONTENT_POLICY'))       return 'moderation_rejection'
  return 'publish_error'
}

export function createGBPClient(accessToken: string) {
  async function request(url: string, options?: RequestInit): Promise<Response> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (res.status === 401) {
      throw new GBPTokenExpiredError()
    }

    if (!res.ok) {
      const body = await res.text()
      const code = classifyError(res.status, body)
      throw new GBPApiError(code, res.status, `GBP API error (${res.status}): ${body}`)
    }

    return res
  }

  return {
    async get<T>(url: string): Promise<T> {
      const res = await request(url)
      return res.json() as Promise<T>
    },
    async post<T>(url: string, body: unknown): Promise<T> {
      const res = await request(url, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return res.json() as Promise<T>
    },
  }
}
