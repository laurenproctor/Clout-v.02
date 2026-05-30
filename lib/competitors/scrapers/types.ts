export interface RawPost {
  external_id:    string
  title?:         string
  content:        string
  url:            string
  thumbnail_url?: string
  published_at:   string   // ISO 8601
  metrics: {
    likes?:    number
    comments?: number
    shares?:   number
    views?:    number
  }
}

export interface ScraperOpts {
  maxPosts?: number   // default 10
}

/** Extract non-empty pathname segments from any URL string. */
export function urlParts(raw: string): string[] {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    return u.pathname.split('/').filter(Boolean)
  } catch {
    return []
  }
}
