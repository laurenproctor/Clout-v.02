import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPin, type CreatePinInput } from '@/lib/pinterest/client'

// createPin serializes the already-resolved input to the Pinterest v5 /pins payload.
// It does NOT normalize content (trim/cap lives in lib/pinterest/content.ts) — it only
// conditionally includes optional fields.
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'pin_123' }),
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastBody(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0]
  return JSON.parse((init as RequestInit).body as string)
}

const base: CreatePinInput = {
  boardId: 'b_1',
  imageUrl: 'https://cdn.example.com/img.png',
  title: 'Small bedroom layout ideas',
  description: 'Explore small bedroom layout ideas for apartments.',
  link: 'https://example.com/guide?utm_source=pinterest',
}

describe('createPin serialization', () => {
  it('sends the core payload and returns the pin id', async () => {
    const result = await createPin('tok', base)
    expect(result).toEqual({ pinId: 'pin_123' })
    const body = lastBody()
    expect(body.board_id).toBe('b_1')
    expect(body.title).toBe(base.title)
    expect(body.description).toBe(base.description)
    expect(body.link).toBe(base.link)
    expect(body.media_source).toEqual({ source_type: 'image_url', url: base.imageUrl })
  })

  it('omits board_section_id when absent and sends it when present', async () => {
    await createPin('tok', base)
    expect(lastBody()).not.toHaveProperty('board_section_id')

    fetchMock.mockClear()
    await createPin('tok', { ...base, boardSectionId: 'sec_9' })
    expect(lastBody().board_section_id).toBe('sec_9')
  })

  it('omits alt_text when absent and sends it when present', async () => {
    await createPin('tok', base)
    expect(lastBody()).not.toHaveProperty('alt_text')

    fetchMock.mockClear()
    await createPin('tok', { ...base, altText: 'A small apartment bedroom with shelves.' })
    expect(lastBody().alt_text).toBe('A small apartment bedroom with shelves.')
  })

  it('publishes a Pin without a board section unchanged (back-compat)', async () => {
    const result = await createPin('tok', base)
    expect(result.pinId).toBe('pin_123')
    expect(lastBody()).not.toHaveProperty('board_section_id')
  })
})
