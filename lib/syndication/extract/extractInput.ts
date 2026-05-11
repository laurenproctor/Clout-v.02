import type { ExtractedContent } from '@/lib/syndicate/types/analysis'
import { extractUrl } from './extractUrl'

function isUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"]+/)
  if (!match) return null
  // Strip trailing punctuation that may have been captured (periods, commas, etc.)
  const url = match[0].replace(/[.,;:!?)'"\]]+$/, '')
  try {
    new URL(url)
    return url
  } catch {
    return null
  }
}

const MAX_CHARS = 12_000

function rawTextToExtractedContent(text: string): ExtractedContent {
  const trimmed = text.trim().slice(0, MAX_CHARS)
  const words = trimmed.split(/\s+/)
  const wordCount = words.length
  const estimatedReadTime = Math.ceil(wordCount / 200)

  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? ''
  const title = firstSentence.length > 80
    ? firstSentence.slice(0, 80) + '…'
    : firstSentence

  return {
    url: '',
    title,
    content: trimmed,
    excerpt: trimmed.slice(0, 200),
    sections: [{ text: trimmed }],
    chunks: [{
      id: 'chunk-0',
      text: trimmed,
      tokenCount: Math.ceil(trimmed.length / 4),
      order: 0,
    }],
    estimatedReadTime,
  }
}

export function extractRawText(text: string): ExtractedContent {
  const trimmed = text.trim().slice(0, MAX_CHARS)
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (wordCount < 50) throw new Error('LOW_SIGNAL: Content too short for syndication')
  return rawTextToExtractedContent(trimmed)
}

export async function extractInput(input: string): Promise<ExtractedContent> {
  const trimmed = input.trim()

  // Exact URL match
  if (isUrl(trimmed)) {
    return extractUrl(trimmed)
  }

  // URL embedded in text (e.g. user pasted URL + context into the same field)
  const embeddedUrl = extractFirstUrl(trimmed)
  if (embeddedUrl) {
    return extractUrl(embeddedUrl)
  }

  // Raw text fallback
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (wordCount < 50) {
    throw new Error('LOW_SIGNAL: Content too short for syndication')
  }

  return rawTextToExtractedContent(trimmed)
}
