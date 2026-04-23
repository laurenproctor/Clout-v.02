// lib/providers/x/format.ts
import type { OutputContent } from '@/types/domain'
import { getProviderCapabilities } from '@/lib/providers/registry'

export const X_CHAR_LIMIT = getProviderCapabilities('x').charLimit

/**
 * Format output content into a single X post string.
 * May exceed X_CHAR_LIMIT — caller decides single vs thread.
 */
export function formatXText(title: string | null, content: OutputContent): string {
  const hashtags = ((content.hashtags as string[] | undefined) ?? [])
    .map((h) => `#${h}`)
    .join(' ')
  return [title, content.body, hashtags ? `\n${hashtags}` : '']
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

/**
 * Split text into tweet-sized chunks with " (N/total)" numbering.
 * Respects paragraph → sentence → hard-split boundaries.
 */
export function splitIntoThread(text: string): string[] {
  const chunks = splitByParagraphs(text)
  if (chunks.length === 1) return chunks

  const total     = chunks.length
  const numLen    = String(total).length
  const suffixLen = 3 + numLen * 2   // " (N/N)"

  return chunks.map((chunk, i) => {
    const suffix = ` (${i + 1}/${total})`
    if (chunk.length + suffixLen <= X_CHAR_LIMIT) return chunk + suffix
    return chunk.slice(0, X_CHAR_LIMIT - suffixLen).trimEnd() + '…' + suffix
  })
}

function splitByParagraphs(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  const tweets: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para
    if (candidate.length <= X_CHAR_LIMIT) {
      current = candidate
    } else if (para.length > X_CHAR_LIMIT) {
      if (current) { tweets.push(current); current = '' }
      tweets.push(...splitBySentences(para))
    } else {
      if (current) tweets.push(current)
      current = para
    }
  }

  if (current) tweets.push(current)
  return tweets
}

function splitBySentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const tweets: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence.trim()}` : sentence.trim()
    if (candidate.length <= X_CHAR_LIMIT) {
      current = candidate
    } else {
      if (current) tweets.push(current)
      if (sentence.length > X_CHAR_LIMIT) {
        tweets.push(...hardSplit(sentence.trim()))
        current = ''
      } else {
        current = sentence.trim()
      }
    }
  }

  if (current) tweets.push(current)
  return tweets
}

function hardSplit(text: string): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += X_CHAR_LIMIT) {
    chunks.push(text.slice(i, i + X_CHAR_LIMIT))
  }
  return chunks
}
