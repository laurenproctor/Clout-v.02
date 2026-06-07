# BlueSky Integration Design

**Date:** 2026-06-07
**Status:** Approved

## Overview

Add BlueSky as a full publishing channel: OAuth 2.0 PKCE connect flow, content generation, rich-text publishing via the AT Protocol.

BlueSky uses the AT Protocol rather than standard OAuth 2.0. The key differences: the `client_id` is a public URL to a JSON metadata document, DPoP (Demonstration of Proof-of-Possession) token binding is required, and the authorization server is discovered from the user's handle (not a fixed URL). The `@atproto/oauth-client-node` library handles these automatically.

---

## Architecture

| Layer | Change |
|---|---|
| DB | `channel_platform` enum + `bluesky`; new `bluesky_oauth_states` and `bluesky_oauth_sessions` tables |
| Client metadata | `GET /api/channels/bluesky/client-metadata.json` — public JSON required by AT Protocol OAuth |
| Connect | `GET /api/channels/bluesky/connect?handle=...` — builds auth URL via `NodeOAuthClient` |
| Callback | `GET /api/channels/bluesky/callback` — exchanges code, stores channel + DPoP session |
| OAuth client | `lib/bluesky/oauth-client.ts` — `NodeOAuthClient` singleton with Supabase-backed stores |
| Publish route | `POST /api/channels/bluesky/post` |
| Publish fn | `publishBlueSkyOutput()` in `lib/domain/publishing.ts` |
| Rich text | `@atproto/api` `RichText` class — detects links, @mentions, #tags → AT Protocol facets |
| Generation | `lib/syndication/platforms/bluesky.ts` + registry + distribution platform registry |
| UI | `BlueSkyIcon` + `PlatformCard` + pre-connect handle modal in `/settings/publishing` |

---

## Database

### Migration: `20260607001_bluesky_platform.sql`

```sql
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'bluesky';
```

### Migration: `20260607002_bluesky_oauth.sql`

```sql
-- Transient OAuth state (10-min TTL during connect flow)
-- Implements NodeOAuthClient stateStore interface
CREATE TABLE bluesky_oauth_states (
  key        text        PRIMARY KEY,
  state_data jsonb       NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Persistent DPoP-bound sessions (keyed by DID)
-- Implements NodeOAuthClient sessionStore interface
CREATE TABLE bluesky_oauth_sessions (
  sub          text        PRIMARY KEY,  -- DID e.g. did:plc:xxx
  session_data jsonb       NOT NULL,
  channel_id   uuid        REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid        REFERENCES workspaces(id) ON DELETE CASCADE,
  updated_at   timestamptz DEFAULT now()
);
```

`bluesky_oauth_states` holds PKCE/nonce state for the duration of the OAuth redirect window and is deleted on callback. `bluesky_oauth_sessions` holds the DPoP keypair and tokens, keyed by the user's DID. The existing `channel_credentials` table also gets a row per connection, with the DID stored in `account_id` — this is how `publishBlueSkyOutput` looks up which session to restore.

---

## OAuth Flow

### No new env vars required

The AT Protocol OAuth `client_id` is derived from `NEXT_PUBLIC_APP_URL` (already set). No developer app registration or API keys needed.

### Client metadata — `GET /api/channels/bluesky/client-metadata.json`

Static JSON response at a public URL. The AT Protocol requires this; `client_id` IS this URL.

```json
{
  "client_id": "{APP_URL}/api/channels/bluesky/client-metadata.json",
  "client_name": "Clout",
  "client_uri": "{APP_URL}",
  "redirect_uris": ["{APP_URL}/api/channels/bluesky/callback"],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

### `NodeOAuthClient` singleton — `lib/bluesky/oauth-client.ts`

Initialized once per process with:
- `clientMetadata` — the JSON above (inlined, not fetched)
- `stateStore` — Supabase wrapper over `bluesky_oauth_states` (`get/set/del`)
- `sessionStore` — Supabase wrapper over `bluesky_oauth_sessions` (`get/set/del`)

### Connect — `GET /api/channels/bluesky/connect?handle=...`

1. Verify Clerk session, extract `workspaceId`
2. Sign `workspaceId` into OAuth `state` param via existing `signOAuthState`
3. `oauthClient.authorize(handle, { state })` — discovers PDS from handle, builds auth URL
4. Redirect user to auth URL
5. Store `workspaceId` in a short-lived HttpOnly cookie (`bs_workspace`, 10-min TTL, HttpOnly + SameSite=lax) for the callback to read

The `handle` parameter is required — AT Protocol must discover the user's PDS before building the auth URL. It comes from the pre-connect modal in the UI.

### Callback — `GET /api/channels/bluesky/callback`

1. `oauthClient.callback(searchParams)` — validates state, exchanges code, stores DPoP session
2. Get `workspaceId` from cookie, verify state via `verifyOAuthState`
3. Fetch profile: `agent.getProfile({ actor: session.did })`
4. `createOrUpdateChannelByAccountId({ platform: 'bluesky', accountId: did, label: '@handle' })`
5. `upsertChannelCredential({ accountId: did, ... })` — stores DID for publish-time lookup
6. Update `bluesky_oauth_sessions` row with `channel_id` and `workspace_id`
7. Redirect to `/settings/publishing?connected=bluesky`

---

## Publishing Pipeline

### `lib/domain/channels.ts`

Add `bluesky: { char_limit: 300 }` to `DEFAULT_CONFIG`.

### `lib/domain/publishing.ts`

**`formatBlueSkyText(content: OutputContent): string`**
- Strips markdown
- Hard truncates to 300 characters
- No ellipsis padding — generation targets the limit directly

**`publishBlueSkyOutput(output: Output, opts?): Promise<{ postId: string }>`**
1. Load channel credential → get `did` from `accountId`
2. `oauthClient.restore(did)` → authenticated `Agent` with DPoP managed automatically
3. `const rt = new RichText({ text: formatBlueSkyText(output.content) })`
4. `await rt.detectFacets(agent)` — resolves @mentions to DIDs, marks URLs and #tags as facets
5. `agent.post({ text: rt.text, facets: rt.facets, langs: ['en'] })`
6. Return `{ postId: response.uri }` — the AT URI (e.g. `at://did:plc:xxx/app.bsky.feed.post/yyy`)

**`publishOutput()` dispatch** — add `bluesky` case.

### Post route — `POST /api/channels/bluesky/post`

Identical structure to Twitter post route: auth check → load output → acquire publish lock → `publishBlueSkyOutput` → `markPublished`/`markFailed`.

---

## Content Generation

### `lib/syndication/types/intelligence.ts`

Add `'bluesky'` to the `Platform` union.

### `lib/syndication/platforms/bluesky.ts`

New `BLUESKY_PLATFORM_MODEL`. Rhetorical environment: BlueSky is a text-first network where the community skews toward thoughtful, long-form thinkers who left Twitter. It values intellectual honesty, genuine perspectives, and conversational depth over virality. Hashtag spam is actively disliked. Links and @mentions encouraged. Hard limit: 300 characters. No thread support in v1.

### `lib/syndication/registry.ts`

Import and register `BLUESKY_PLATFORM_MODEL` in `PLATFORM_REGISTRY`.

### `lib/distribution/platform-registry.ts`

Add `bluesky: { label: 'BlueSky', defaultUTM: { source: 'bluesky', medium: 'social' } }` to `DISTRIBUTION_PLATFORMS`.

---

## UI

### `/settings/publishing/page.tsx`

1. **`BlueSkyIcon`** — SVG butterfly logo component
2. **`PlatformCard` entry** — BlueSky in the social platforms section
3. **`?connected=bluesky` toast** — success message on redirect back
4. **Pre-connect modal** — small dialog triggered by the Connect button. Contains a single text input for the user's handle (placeholder: `@username.bsky.social`). On submit, navigates to `/api/channels/bluesky/connect?handle=...`. This modal is the only UI divergence from the standard pattern — it's required because AT Protocol must discover the user's PDS from the handle before it can build an auth URL.

---

## Dependencies

New packages:
- `@atproto/oauth-client-node` — AT Protocol OAuth 2.0 client (DPoP, PDS discovery, PKCE)
- `@atproto/api` — AT Protocol API client + `RichText` for facet detection

---

## Out of Scope (v1)

- Thread/skeet multi-post support
- Image attachment on BlueSky posts
- Analytics for BlueSky (impressions, likes, reposts)
