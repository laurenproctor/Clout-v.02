/**
 * Build the clipboard payload for "Copy": the post body plus any hashtags that
 * aren't already written into the body. Hashtags are stored without the '#'
 * prefix; we skip ones already present (case-insensitive, word-boundary) so a
 * body that already ends with its tags isn't given a duplicate block.
 */
export function serializeForCopy(body: string, hashtags: string[]): string {
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
    .filter(t => !new RegExp(`#${escape(t)}\\b`, 'i').test(body))

  if (toAppend.length === 0) return body.trimEnd()
  return `${body.trimEnd()}\n\n${toAppend.map(t => `#${t}`).join(' ')}`
}
