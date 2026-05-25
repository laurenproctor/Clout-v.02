import { describe, it, expect } from 'vitest'
import { getWorkspaceSlug } from '../workspace-context'

// NextRequest mock — only needs headers
function makeRequest(headers: Record<string, string>) {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as any
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
