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
        'Accept-Encoding': 'gzip, deflate, br',
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

export async function fetchHtml(url: string): Promise<string> {
  try {
    new URL(url)
  } catch {
    throw new Error(`FETCH_FAILED: Malformed URL — ${url}`)
  }

  const res = await fetchWithRetry(url, 1, 3)
  return res.text()
}
