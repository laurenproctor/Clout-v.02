// lib/channels/apple-business-connect/client.ts
import { ABC_BASE_URL } from './api-contract'
import { ABCTokenExpiredError, ABCApiError } from './types'
import type { ABCCredentials } from './types'
import { getABCAccessToken } from './auth'

export function createABCClient(creds: ABCCredentials) {
  async function bearerToken(): Promise<string> {
    return getABCAccessToken(creds.keyId, creds.issuerId, creds.privateKey)
  }

  async function request(path: string, options?: RequestInit): Promise<Response> {
    const token = await bearerToken()
    const res   = await fetch(`${ABC_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (res.status === 401) throw new ABCTokenExpiredError()
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ABCApiError(res.status, `ABC API ${res.status}: ${body}`)
    }
    return res
  }

  return {
    async get<T>(path: string): Promise<T> {
      return (await request(path)).json() as Promise<T>
    },
    async post<T>(path: string, body: unknown): Promise<T> {
      return (await request(path, {
        method: 'POST',
        body:   JSON.stringify(body),
      })).json() as Promise<T>
    },
  }
}
