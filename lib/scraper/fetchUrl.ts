const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  attempt: number,
  maxAttempts: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // NOTE: do not set Accept-Encoding manually. undici only transparently
        // decompresses the response body when it controls this header; supplying
        // our own would make res.text() return raw gzip/brotli bytes (garbled
        // HTML → empty extraction). Letting undici negotiate fixes that.
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    })

    if (res.status === 429 && attempt < maxAttempts) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '2', 10)
      await sleep(retryAfter * 1000)
      return fetchWithRetry(url, attempt + 1, maxAttempts)
    }

    if (res.status === 403) {
      throw new Error(`FETCH_BLOCKED: 403 Forbidden — ${url}`)
    }

    if (!res.ok) {
      throw new Error(`FETCH_FAILED: HTTP ${res.status} — ${url}`)
    }

    return res
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`FETCH_TIMEOUT: Request exceeded 12s — ${url}`)
    }
    if (attempt < maxAttempts && !(err instanceof Error && err.message.startsWith('FETCH_BLOCKED'))) {
      await sleep(1000 * attempt)
      return fetchWithRetry(url, attempt + 1, maxAttempts)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Ordered host/scheme variants to try for a URL, so a site that only serves on
 * `www` (or only the apex, or only one scheme) still resolves. The original URL
 * is always first; we then toggle www↔apex on the given scheme, then the other
 * scheme. Deduped and capped so variant retries stay bounded.
 */
export function urlVariants(raw: string): string[] {
  let base: URL
  try {
    base = new URL(raw)
  } catch {
    return [raw]
  }

  const hosts = [base.hostname]
  if (base.hostname.startsWith('www.')) hosts.push(base.hostname.slice(4))
  else hosts.push(`www.${base.hostname}`)

  // Try the given scheme first, then the other one.
  const schemes = base.protocol === 'http:' ? ['http:', 'https:'] : ['https:', 'http:']

  const variants: string[] = []
  const add = (scheme: string, host: string) => {
    const u = new URL(base.toString())
    u.protocol = scheme
    u.hostname = host
    const s = u.toString()
    if (!variants.includes(s)) variants.push(s)
  }

  add(base.protocol, base.hostname) // original always first
  for (const scheme of schemes) {
    for (const host of hosts) add(scheme, host)
  }
  return variants.slice(0, 4)
}

export async function fetchHtml(url: string): Promise<string> {
  try {
    new URL(url)
  } catch {
    throw new Error(`FETCH_FAILED: Malformed URL — ${url}`)
  }

  let lastConnErr: unknown
  for (const variant of urlVariants(url)) {
    try {
      const res = await fetchWithRetry(variant, 1, 3)
      return res.text()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // A 403, a non-2xx status, or a timeout are *answers* from a reachable
      // server — trying other host/scheme variants won't help, and the caller's
      // Jina fallback (or timeout message) should take over immediately.
      if (
        msg.startsWith('FETCH_BLOCKED') ||
        msg.startsWith('FETCH_FAILED') ||
        msg.startsWith('FETCH_TIMEOUT')
      ) {
        throw err
      }
      // Connection-level failure (DNS / refused / TLS / reset): try next variant.
      lastConnErr = err
    }
  }

  const detail = lastConnErr instanceof Error ? lastConnErr.message : String(lastConnErr)
  throw new Error(`FETCH_UNREACHABLE: Could not connect to ${url} — ${detail}`)
}
