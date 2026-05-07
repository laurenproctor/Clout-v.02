// lib/blog/parseJson.ts
// Claude sometimes wraps JSON in markdown code blocks. Strip them before parsing.
export function parseJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return JSON.parse(stripped) as T
}
