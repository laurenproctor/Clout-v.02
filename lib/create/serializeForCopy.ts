/**
 * Build the clipboard payload for "Copy": the post body plus any hashtags that
 * aren't already written into the body. Hashtags are stored without the '#'
 * prefix; we skip ones already present (case-insensitive, word-boundary) so a
 * body that already ends with its tags isn't given a duplicate block.
 */
import { docToDisplayText, docHasContent } from '@/lib/linkedin/richText'

export function serializeForCopy(body: string, hashtags: string[], bodyRich?: unknown): string {
  // Copy must match what publishes: Unicode bold/italic + plain @Name, but WITHOUT
  // little escaping (clipboard should read `@Name`/`#Tag`, never `\@Name`).
  const base = docHasContent(bodyRich) ? docToDisplayText(bodyRich) : body
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const seen = new Set<string>()
  const toAppend = (hashtags ?? [])
    .map(t => t.replace(/^#+/, '').trim())
    .filter(Boolean)
    .filter(t => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .filter(t => !new RegExp(`#${escape(t)}\\b`, 'i').test(base))

  if (toAppend.length === 0) return base.trimEnd()
  return `${base.trimEnd()}\n\n${toAppend.map(t => `#${t}`).join(' ')}`
}
