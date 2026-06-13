import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Output } from '@/types/domain'

// Publish-level wiring: prove publishPinterestOutput passes the RESOLVED Pinterest-native
// fields into createPin and never mutates the canonical destination URL stored in content.
// resolvePinterestText (the real resolver) stays unmocked; everything else is stubbed.

const createPin = vi.hoisted(() => vi.fn().mockResolvedValue({ pinId: 'pin_999' }))
vi.mock('@/lib/pinterest/client', () => ({
  createPin,
  pinterestPinUrl: (id: string) => `https://www.pinterest.com/pin/${id}/`,
}))

vi.mock('@/lib/pinterest/readiness', () => ({ assertPinterestReadiness: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/pinterest/credential', () => ({ getValidPinterestToken: vi.fn().mockResolvedValue('tok') }))
vi.mock('@/lib/pinterest/boards', () => ({ resolveBoardForOutput: vi.fn().mockResolvedValue('board_1') }))
vi.mock('@/lib/pinterest/image', () => ({
  resolvePinterestImage: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/img.png', altText: 'asset alt' }),
}))
vi.mock('@/lib/pinterest/destination', () => ({
  resolvePinterestDestinationUrl: vi.fn().mockReturnValue('https://example.com/guide'),
  tagPinterestDestination: vi.fn().mockResolvedValue('https://example.com/guide?utm_source=pinterest'),
}))
vi.mock('@/lib/domain/publish-log', () => ({ createPublishLog: vi.fn().mockResolvedValue(undefined) }))

import { publishPinterestOutput } from '@/lib/domain/publishing'

const CANONICAL = 'https://example.com/guide'

function makeOutput(): Output {
  return {
    id: 'o_1',
    workspaceId: 'ws_1',
    channelId: 'ch_1',
    providerPostId: null,
    title: 'Generic post title',
    content: {
      body: 'Generic body that should NOT be used as the description.',
      destinationUrl: CANONICAL,
      platforms: {
        pinterest: {
          title: 'Small bedroom layout ideas',
          description: 'Explore small bedroom layout ideas for apartments.',
          altText: 'A small apartment bedroom with shelves.',
          boardSectionId: 'sec_7',
        },
      },
    },
  } as unknown as Output
}

beforeEach(() => { createPin.mockClear() })

describe('publishPinterestOutput wiring', () => {
  it('passes the resolved Pinterest-native fields into createPin', async () => {
    const output = makeOutput()
    const result = await publishPinterestOutput(output)
    expect(result).toEqual({ pinId: 'pin_999' })

    expect(createPin).toHaveBeenCalledTimes(1)
    const [token, input] = createPin.mock.calls[0]
    expect(token).toBe('tok')
    expect(input.boardId).toBe('board_1')
    expect(input.title).toBe('Small bedroom layout ideas')                       // platform title, not output.title
    expect(input.description).toBe('Explore small bedroom layout ideas for apartments.') // platform desc, not body
    expect(input.altText).toBe('A small apartment bedroom with shelves.')        // platform alt over asset alt
    expect(input.boardSectionId).toBe('sec_7')
    expect(input.link).toBe('https://example.com/guide?utm_source=pinterest')    // UTM-rendered link
  })

  it('does not mutate the canonical destination URL in content', async () => {
    const output = makeOutput()
    await publishPinterestOutput(output)
    expect(output.content.destinationUrl).toBe(CANONICAL)
    expect(output.content.platforms?.pinterest?.destinationUrl).toBeUndefined()
  })

  it('falls back to generic title/body and asset alt when no platform fields', async () => {
    const output = {
      id: 'o_2', workspaceId: 'ws_1', channelId: 'ch_1', providerPostId: null,
      title: 'Generic post title',
      content: { body: 'Generic body', destinationUrl: CANONICAL },
    } as unknown as Output
    await publishPinterestOutput(output)
    const [, input] = createPin.mock.calls[0]
    expect(input.title).toBe('Generic post title')
    expect(input.description).toBe('Generic body')
    expect(input.altText).toBe('asset alt')          // from resolved image
    expect(input.boardSectionId).toBeUndefined()
  })
})
