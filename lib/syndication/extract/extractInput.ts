import { extractContent } from '@/lib/syndicate/extract/extractContent'
import type { ExtractedContent } from '@/lib/syndicate/types/analysis'

function isUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function rawTextToExtractedContent(text: string): ExtractedContent {
  const trimmed = text.trim()
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

export async function extractInput(input: string): Promise<ExtractedContent> {
  const trimmed = input.trim()

  if (isUrl(trimmed)) {
    return extractContent(trimmed)
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (wordCount < 50) {
    throw new Error('LOW_SIGNAL: Content too short for syndication')
  }

  return rawTextToExtractedContent(trimmed)
}
