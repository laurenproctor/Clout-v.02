import { describe, it, expect } from 'vitest'
import type { NextRequest } from 'next/server'
import { getWorkspaceSlug } from '../workspace-context'

// NextRequest mock — only needs headers.get for getWorkspaceSlug.
function makeRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as NextRequest
}

describe('getWorkspaceSlug', () => {
  it('returns slug from header', () => {
    const req = makeRequest({ 'x-workspace-slug': 'amlon' })
    expect(getWorkspaceSlug(req)).toBe('amlon')
  })

  it('returns null when header absent', () => {
    const req = makeRequest({})
    expect(getWorkspaceSlug(req)).toBeNull()
  })
})
