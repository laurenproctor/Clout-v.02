// lib/blog/parseJson.ts
// Claude sometimes wraps JSON in markdown code blocks, and sometimes includes
// literal newlines/tabs inside string values (invalid JSON). Strip both before parsing.

function repairLiteralControlChars(s: string): string {
  // Walk character by character, tracking whether we're inside a JSON string.
  // Replace literal control characters inside strings with their escape sequences.
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < s.length; i++) {
    const char = s[i]

    if (escaped) {
      result += char
      escaped = false
      continue
    }

    if (char === '\\' && inString) {
      result += char
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      result += char
      continue
    }

    if (inString) {
      if (char === '\n') { result += '\\n'; continue }
      if (char === '\r') { result += '\\r'; continue }
      if (char === '\t') { result += '\\t'; continue }
    }

    result += char
  }

  return result
}

export function parseJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(stripped) as T
  } catch {
    // Fallback: repair literal control characters inside string values then retry
    return JSON.parse(repairLiteralControlChars(stripped)) as T
  }
}
