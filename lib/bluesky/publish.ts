import type { OutputContent } from '@/types/domain'
import { buildRichText } from './richtext'
import { restoreAgent } from './client'

export function formatBlueSkyText(content: OutputContent): string {
  return content.body?.trim() ?? ''
}

// Converts an AT URI (at://did:plc:xxx/app.bsky.feed.post/yyy) to a bsky.app URL.
// AT URI format: at://<did>/<collection>/<rkey>
export function buildBlueSkyPostUrl(atUri: string): string {
  const parts = atUri.split('/')
  const did   = parts[2]  // 'did:plc:xxx'
  const rkey  = parts[4]  // 'yyy'
  return `https://bsky.app/profile/${did}/post/${rkey}`
}

export async function postToBlueSky(
  did: string,
  content: OutputContent,
): Promise<{ postId: string }> {
  const text = formatBlueSkyText(content)

  if (text.length > 300) {
    throw Object.assign(
      new Error(
        `BlueSky post exceeds 300-character limit (${text.length} chars). Please shorten the content and try again.`
      ),
      { code: 'content_too_long', retryable: false }
    )
  }

  const agent = await restoreAgent(did)
  const { text: richText, facets, langs } = await buildRichText(text, agent)

  const response = await agent.post({
    text:   richText,
    facets: facets as Parameters<typeof agent.post>[0]['facets'],
    langs,
  })

  return { postId: response.uri }
}
