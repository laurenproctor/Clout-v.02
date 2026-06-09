export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Use lookarounds instead of \b so keywords ending in non-word chars (e.g. "C++") work correctly.
// (?<![a-zA-Z0-9_]) = not preceded by a word char; (?![a-zA-Z0-9_]) = not followed by a word char.
export function matchesBlockedKeyword(text: string, keywords: string[]): boolean {
  if (!keywords.length) return false
  return keywords.some(kw =>
    new RegExp(`(?<![a-zA-Z0-9_])${escapeRegex(kw)}(?![a-zA-Z0-9_])`, 'i').test(text)
  )
}

export function buildSearchableText(fields: (string | null | undefined)[]): string {
  return fields.filter(Boolean).join(' ')
}
