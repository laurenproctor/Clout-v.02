import { PublishingError } from '@/lib/publishing/errors'
import { classifyMediumError } from '@/lib/publishing/errors'
import type { MediumUser, MediumPublication, MediumPost, MediumCreatePostPayload } from './types'

const BASE_URL = 'https://api.medium.com/v1'

export class MediumClient {
  constructor(private readonly accessToken: string) {}

  async getUser(): Promise<MediumUser> {
    const data = await this.request<{ data: MediumUser }>('GET', '/me')
    return data.data
  }

  async getPublications(userId: string): Promise<MediumPublication[]> {
    const data = await this.request<{ data: MediumPublication[] }>('GET', `/users/${userId}/publications`)
    return data.data ?? []
  }

  async createUserPost(userId: string, payload: MediumCreatePostPayload): Promise<MediumPost> {
    const data = await this.request<{ data: MediumPost }>('POST', `/users/${userId}/posts`, payload)
    return data.data
  }

  async createPublicationPost(publicationId: string, payload: MediumCreatePostPayload): Promise<MediumPost> {
    const data = await this.request<{ data: MediumPost }>('POST', `/publications/${publicationId}/posts`, payload)
    return data.data
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization:  `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      let mediumErrors: Array<{ message: string; code: number }> | undefined
      try {
        const json = await res.json() as { errors?: Array<{ message: string; code: number }> }
        mediumErrors = json.errors
      } catch {
        // non-JSON error body — ignore
      }

      const classified = classifyMediumError(res.status, mediumErrors)
      const message = mediumErrors?.[0]?.message
        ?? `Medium API error (${res.status} ${res.statusText})`

      const err = new PublishingError(message, classified.code, classified.retryable)
      err.retryCategory = classified.retryCategory
      err.provider      = 'medium'
      throw err
    }

    return res.json() as Promise<T>
  }
}
