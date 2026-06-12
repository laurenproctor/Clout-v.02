import type { KeywordProvider } from '@/types/domain'

export function normalizeKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function getDefaultKeywordConfig(provider: KeywordProvider): Record<string, unknown> {
  switch (provider) {
    case 'reddit': return { sort: 'new' }
    default:       return {}
  }
}
