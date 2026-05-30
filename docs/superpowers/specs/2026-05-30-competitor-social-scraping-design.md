# Competitor Social Post Scraping — Design Spec
Date: 2026-05-30

## Overview

Pull recent posts from competitor social accounts (YouTube, Twitter/X, LinkedIn, Instagram, Facebook) stored in `competitor_metadata.socials` and surface them in the Signal Intelligence feed's Competitors tab under a new "From their socials" section.

---

## Architecture

### Data Storage

New Supabase table: `competitor_social_posts`

```sql
create table competitor_social_posts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  competitor_domain text not null,
  platform        text not null check (platform in ('youtube','twitter','instagram','linkedin','facebook')),
  post_id         text not null,
  content         text,
  url             text not null,
  thumbnail_url   text,
  published_at    timestamptz,
  fetched_at      timestamptz not null default now(),
  metrics         jsonb default '{}',
  unique (platform, post_id)
);

create index on competitor_social_posts (workspace_id, competitor_domain, published_at desc);
```

`metrics` shape: `{ likes?: number, comments?: number, shares?: number, views?: number }`

### New Files

```
lib/competitors/scrapers/
  youtube.ts
  twitter.ts
  facebook.ts
  linkedin.ts
  instagram.ts
  types.ts          (shared SocialPost return type)

lib/competitors/ingest-socials.ts   (orchestrates per-workspace ingestion)

app/api/admin/ingest-social-posts/route.ts   (cron + manual trigger)
app/api/competitors/social-posts/route.ts    (read endpoint for UI)

components/feed/CompetitorSocialPostCard.tsx
```

### Unchanged

- `/api/competitors/posts` (RSS/blog scraping) — untouched
- `/api/competitors/signals` (newsdata.io) — untouched
- `competitor_metadata` schema — read-only from scrapers

---

## Per-Platform Scrapers

All scrapers implement the same interface:

```ts
interface SocialPost {
  post_id: string
  content: string
  url: string
  thumbnail_url?: string
  published_at: string   // ISO 8601
  metrics: { likes?: number; comments?: number; shares?: number; views?: number }
}

type Scraper = (handle: string, opts: ScraperOpts) => Promise<SocialPost[]>
```

### YouTube (`youtube.ts`)
- **Auth**: `YOUTUBE_API_KEY` env var (required; skip platform if absent)
- **Flow**: Resolve channel URL (`@handle`, `/channel/UCxxx`, `/user/xxx`) → channel ID → uploads playlist ID → 10 most recent playlist items
- **API**: YouTube Data API v3 (`googleapis.com/youtube/v3/`)
- **Metrics**: `views`, `likes`, `comments` from video statistics

### Twitter/X (`twitter.ts`)
- **Auth**: None — uses Twitter's public guest token API
- **Flow**: POST guest activation endpoint with public bearer token → get `guest_token` → resolve screen name to user ID via GraphQL `UserByScreenName` → fetch `UserTweets` via GraphQL
- **Maintenance surface**: GraphQL endpoint hashes are constants that rotate periodically; stored as named constants for easy update
- **Metrics**: `likes`, `comments` (replies), `shares` (retweets) from tweet legacy fields

### Facebook (`facebook.ts`)
- **Auth**: None
- **Flow**: Fetch `mbasic.facebook.com/{slug}` (server-rendered HTML, no JS) → parse post text, timestamps, reaction counts with regex
- **Metrics**: Reaction count parsed from HTML; comments parsed where available

### LinkedIn (`linkedin.ts`)
- **Auth**: `LINKEDIN_LI_AT` session cookie env var (optional; skip platform and log warning if absent)
- **Flow**: Resolve company slug → company ID via Voyager `universalName` lookup → fetch company feed via Voyager feed API
- **Headers**: `Cookie: li_at={value}`, `csrf-token` (derived from cookie), `x-restli-protocol-version: 2.0.0`
- **Metrics**: `likes`, `comments` from feed update social detail

### Instagram (`instagram.ts`)
- **Auth**: `INSTAGRAM_SESSION_ID` env var (optional; improves reliability, graceful degradation without it)
- **Flow**: Resolve username → user ID via `i.instagram.com/api/v1/users/web_profile_info/` → fetch recent feed via `i.instagram.com/api/v1/feed/user/{id}/`
- **Headers**: `User-Agent: Instagram mobile`, `x-ig-app-id: 936619743392459`
- **Metrics**: `likes`, `comments` from media nodes

---

## Ingestion Pipeline

### Route: `POST /api/admin/ingest-social-posts`

- **GET**: Vercel cron (every 6 hours) — validated by `Authorization: Bearer {CRON_SECRET}`
- **POST**: Manual trigger — validated by `x-admin-secret` header (same pattern as ingest-signals)

### `lib/competitors/ingest-socials.ts`

Per run:
1. Fetch all workspaces that have `competitor_metadata` with at least one social handle
2. For each workspace, iterate competitors (cap at 5 per workspace per run)
3. For each competitor, iterate platforms found in `competitor_metadata.socials`
4. Call appropriate scraper; 1–2s delay between requests per competitor domain
5. Upsert results to `competitor_social_posts` by `(platform, post_id)`
6. Return `{ scraped, inserted, skipped, errors }`

### Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/admin/ingest-social-posts", "schedule": "0 */6 * * *" }
  ]
}
```

---

## Read API

### `GET /api/competitors/social-posts`

Authenticated by session. Returns posts for the calling workspace, sorted newest-first, limited to 50. Optional `?platform=` filter.

Response: `{ posts: SocialPost[] }`

---

## UI

### Location

Competitors tab in Signal Intelligence feed (`components/feed/SignalFeed.tsx`). New "From their socials" section inserted between the existing "From their channels" (blog/RSS) section and the "Signal tracking" section.

### `CompetitorSocialPostCard`

Displays:
- Platform icon + badge (YouTube red, Twitter/X black, LinkedIn blue, Instagram gradient, Facebook blue)
- Competitor brand name and domain (with favicon)
- Post content truncated to ~240 chars with ellipsis
- Thumbnail image where available (YouTube, Instagram)
- Metrics row: likes · comments · views/shares (omit zero/missing values)
- Relative timestamp ("3h ago", "2d ago")
- External link → opens original post in new tab

No per-platform filtering in v1. Posts sorted newest-first across all platforms and competitors.

### Fetch

`SignalFeed.tsx` fetches `/api/competitors/social-posts` alongside the existing `/api/competitors/signals` and `/api/competitors/posts` calls when the Competitors tab is active. Results cached in a new `socialPostCache` state slot alongside the existing `competitorPostCache`.

---

## Error Handling & Graceful Degradation

- Missing env vars (`YOUTUBE_API_KEY`, `LINKEDIN_LI_AT`, `INSTAGRAM_SESSION_ID`): skip that platform, log warning, continue
- Scraper throws (network error, parsing failure, rate limit): log error, mark in result, continue to next competitor/platform
- No posts returned for a competitor: silently skip — don't surface errors in UI
- Stale data: `fetched_at` column; UI shows posts regardless of age (no TTL enforcement in v1)
- Twitter GraphQL hash rotation: constants file updated manually; failure logs a clear message indicating which constant needs updating

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `YOUTUBE_API_KEY` | For YouTube | YouTube Data API v3 |
| `LINKEDIN_LI_AT` | For LinkedIn | Voyager API session cookie |
| `INSTAGRAM_SESSION_ID` | For Instagram | Private API session cookie |
| `CRON_SECRET` | Yes (existing) | Vercel cron authorization |
| `ADMIN_SECRET` | Yes (existing) | Manual trigger authorization |

---

## Out of Scope (v1)

- Per-platform filter tabs in the UI
- TTL-based post expiry
- Engagement trend analysis on social posts
- Storing full media (images/videos) — thumbnail URLs only
- Post deduplication across RSS and social (same article may appear in both)
