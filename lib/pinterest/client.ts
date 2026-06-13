// lib/pinterest/client.ts
// Server-side only. Pinterest v5 boards + pins.
import { pinterestApiBase } from './oauth'
import { PinterestApiError, type PinterestBoard } from './types'

/** Lists all boards for the authenticated account, following pagination bookmarks. */
export async function listBoards(accessToken: string): Promise<PinterestBoard[]> {
  const boards: PinterestBoard[] = []
  let bookmark: string | undefined

  do {
    const params = new URLSearchParams({ page_size: '250' })
    if (bookmark) params.set('bookmark', bookmark)
    const res = await fetch(`${pinterestApiBase()}/boards?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new PinterestApiError(`Failed to list Pinterest boards: ${text}`, res.status, 'board_list_failed')
    }
    const data = await res.json()
    for (const item of (data.items ?? []) as Array<Record<string, unknown>>) {
      boards.push({
        id:      item.id as string,
        name:    item.name as string,
        privacy: item.privacy as string | undefined,
        url:     (item.url as string | undefined) ?? null,
      })
    }
    bookmark = data.bookmark || undefined
  } while (bookmark)

  return boards
}

export interface CreatePinInput {
  boardId: string
  imageUrl: string
  title: string
  description: string
  link: string
  altText?: string
  boardSectionId?: string
}

/**
 * Creates an image Pin. The media_source shape is deliberately isolated so a future
 * video Pin (source_type: 'video_id') slots in without changing this signature.
 */
export async function createPin(accessToken: string, input: CreatePinInput): Promise<{ pinId: string }> {
  const body: Record<string, unknown> = {
    board_id:    input.boardId,
    title:       input.title.slice(0, 100),
    description: input.description.slice(0, 500),
    link:        input.link,
    media_source: { source_type: 'image_url', url: input.imageUrl },
  }
  if (input.altText) body.alt_text = input.altText.slice(0, 500)
  if (input.boardSectionId) body.board_section_id = input.boardSectionId

  const res = await fetch(`${pinterestApiBase()}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new PinterestApiError(`Pinterest pin creation failed: ${text}`, res.status, 'pin_create_failed')
  }
  const data = await res.json()
  return { pinId: data.id as string }
}

export function pinterestPinUrl(pinId: string): string {
  return `https://www.pinterest.com/pin/${pinId}/`
}
