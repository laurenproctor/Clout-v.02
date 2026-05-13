// lib/blog/parseJson.ts
// Claude sometimes wraps JSON in markdown code blocks, returns literal control
// characters inside string values, or truncates mid-string when near token limits.
// jsonrepair handles all three cases.
import { jsonrepair } from 'jsonrepair'

export function parseJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(stripped) as T
  } catch {
    // jsonrepair handles: unescaped control chars, truncated strings/objects,
    // trailing commas, single-quoted strings, and other common LLM JSON quirks.
    return JSON.parse(jsonrepair(stripped)) as T
  }
}
