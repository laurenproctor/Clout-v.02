# BlueSky Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BlueSky as a full publishing channel — OAuth 2.0 connect, content generation (300 chars), and rich-text publishing via the AT Protocol.

**Architecture:** Uses `@atproto/oauth-client-node` to handle DPoP token binding, PKCE, and per-user PDS discovery automatically. DPoP sessions are stored in two new Supabase tables (`bluesky_oauth_states` for transient OAuth flow state, `bluesky_oauth_sessions` for persistent sessions). Core publish logic lives in a dedicated `lib/bluesky/` module; `publishBlueSkyOutput()` in `lib/domain/publishing.ts` is a thin orchestration wrapper. No silent truncation — posts exceeding 300 chars after formatting throw `content_too_long`.

**Tech Stack:** `@atproto/oauth-client-node`, `@atproto/api` (RichText/facets), Supabase, Vitest, Next.js App Router, Trigger.dev v3

---

## File Map

**Create:**
- `supabase/migrations/20260607001_bluesky_platform.sql`
- `supabase/migrations/20260607002_bluesky_oauth.sql`
- `lib/bluesky/types.ts`
- `lib/bluesky/oauth-client.ts`
- `lib/bluesky/client.ts`
- `lib/bluesky/richtext.ts`
- `lib/bluesky/publish.ts`
- `app/api/channels/bluesky/client-metadata/route.ts`
- `app/api/channels/bluesky/connect/route.ts`
- `app/api/channels/bluesky/callback/route.ts`
- `app/api/channels/bluesky/post/route.ts`
- `lib/syndication/platforms/bluesky.ts`
- `lib/trigger/jobs/cleanup-bluesky-oauth-states.ts`
- `tests/bluesky/richtext.test.ts`
- `tests/bluesky/publish.test.ts`
- `tests/bluesky/registry.test.ts`

**Modify:**
- `types/domain.ts` — add `'bluesky'` to `ChannelPlatform`
- `lib/syndication/types/intelligence.ts` — add `'bluesky'` to `Platform`
- `lib/domain/channels.ts` — add bluesky to `DEFAULT_CONFIG`
- `lib/domain/publishing.ts` — add `publishBlueSkyOutput()` + dispatch case
- `lib/syndication/registry.ts` — register bluesky
- `lib/distribution/platform-registry.ts` — add bluesky UTM entry
- `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx` — BlueSky UI

---

## Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Install packages**

```bash
npm install @atproto/oauth-client-node @atproto/api
```

Expected: packages installed without peer dependency errors. If there are conflicts, check for `@atproto/common` version mismatches and pin as needed.

- [ ] **Verify TypeScript can resolve types**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from the atproto packages.

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @atproto/oauth-client-node and @atproto/api"
```

---

## Task 2: DB migration — enum value

**Files:**
- Create: `supabase/migrations/20260607001_bluesky_platform.sql`

- [ ] **Create migration file**

```sql
-- Add 'bluesky' to the channel_platform enum
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'bluesky';
```

- [ ] **Apply migration**

```bash
npx supabase db push
```

Expected: migration runs without errors. Confirm:
```bash
npx supabase db diff
```
Expected: no drift.

- [ ] **Commit**

```bash
git add supabase/migrations/20260607001_bluesky_platform.sql
git commit -m "chore(db): add bluesky to channel_platform enum"
```

---

## Task 3: DB migration — OAuth tables

**Files:**
- Create: `supabase/migrations/20260607002_bluesky_oauth.sql`

- [ ] **Create migration file**

```sql
-- Transient OAuth state (10-min TTL during connect flow)
-- Implements NodeOAuthClient stateStore interface
CREATE TABLE bluesky_oauth_states (
  key        text        PRIMARY KEY,
  state_data jsonb       NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX idx_bluesky_oauth_states_expires_at
  ON bluesky_oauth_states(expires_at);

-- Persistent DPoP-bound sessions (keyed by DID)
-- Implements NodeOAuthClient sessionStore interface
CREATE TABLE bluesky_oauth_sessions (
  sub          text        PRIMARY KEY,  -- DID, e.g. did:plc:xxx
  session_data jsonb       NOT NULL,
  channel_id   uuid        REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid        REFERENCES workspaces(id) ON DELETE CASCADE,
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX idx_bluesky_oauth_sessions_workspace_id
  ON bluesky_oauth_sessions(workspace_id);
```

- [ ] **Apply migration**

```bash
npx supabase db push
```

- [ ] **Commit**

```bash
git add supabase/migrations/20260607002_bluesky_oauth.sql
git commit -m "chore(db): add bluesky_oauth_states and bluesky_oauth_sessions tables"
```

---

## Task 4: Add 'bluesky' to type unions

**Files:**
- Modify: `types/domain.ts`
- Modify: `lib/syndication/types/intelligence.ts`

- [ ] **Update `ChannelPlatform` in `types/domain.ts`**

Find this line (around line 33):
```ts
export type ChannelPlatform = 'linkedin' | 'newsletter' | 'x' | 'twitter' | 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'wordpress' | 'shopify' | 'google_business_profile'
```

Replace with:
```ts
export type ChannelPlatform = 'linkedin' | 'newsletter' | 'x' | 'twitter' | 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'wordpress' | 'shopify' | 'google_business_profile' | 'bluesky'
```

- [ ] **Update `Platform` in `lib/syndication/types/intelligence.ts`**

Find this line:
```ts
export type Platform = 'x' | 'linkedin' | 'substack' | 'blog' | 'threads' | 'facebook' | 'google_business_profile' | 'medium'
```

Replace with:
```ts
export type Platform = 'x' | 'linkedin' | 'substack' | 'blog' | 'threads' | 'facebook' | 'google_business_profile' | 'medium' | 'bluesky'
```

- [ ] **Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: you'll see new errors in `lib/syndication/registry.ts` ("bluesky is missing from PLATFORM_REGISTRY") and `lib/distribution/platform-registry.ts`. These are expected — they'll be fixed in later tasks.

- [ ] **Commit**

```bash
git add types/domain.ts lib/syndication/types/intelligence.ts
git commit -m "feat(bluesky): add bluesky to ChannelPlatform and Platform unions"
```

---

## Task 5: Create `lib/bluesky/types.ts`

**Files:**
- Create: `lib/bluesky/types.ts`

- [ ] **Create file**

```ts
export interface BlueSkyProfile {
  did: string
  handle: string
  displayName: string | null
  description: string | null
  avatar: string | null
}

export interface BlueSkyChannelConfig {
  handle: string
  displayName: string | null
  description: string | null
  char_limit: number
  connect_handle: string  // original handle entered at connect time
}
```

- [ ] **Commit**

```bash
git add lib/bluesky/types.ts
git commit -m "feat(bluesky): add BlueSky types module"
```

---

## Task 6: Create `lib/bluesky/oauth-client.ts`

**Files:**
- Create: `lib/bluesky/oauth-client.ts`

This module creates a singleton `NodeOAuthClient` backed by two Supabase tables. The stateStore holds transient PKCE state during OAuth flow. The sessionStore holds persistent DPoP-bound sessions keyed by DID.

- [ ] **Create file**

```ts
import { NodeOAuthClient } from '@atproto/oauth-client-node'
import { createServiceClient } from '@/lib/supabase/service'

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL is not set')
  return url
}

function buildClient(): NodeOAuthClient {
  const appUrl = getAppUrl()

  return new NodeOAuthClient({
    clientMetadata: {
      client_id:                    `${appUrl}/api/channels/bluesky/client-metadata`,
      client_name:                  'Clout',
      client_uri:                   appUrl,
      redirect_uris:                [`${appUrl}/api/channels/bluesky/callback`],
      scope:                        'atproto transition:generic',
      grant_types:                  ['authorization_code', 'refresh_token'],
      response_types:               ['code'],
      token_endpoint_auth_method:   'none',
      application_type:             'web',
      dpop_bound_access_tokens:     true,
    },

    stateStore: {
      async get(key: string) {
        const supabase = createServiceClient()
        const { data } = await supabase
          .from('bluesky_oauth_states')
          .select('state_data, expires_at')
          .eq('key', key)
          .single()
        if (!data) return undefined
        if (new Date(data.expires_at) < new Date()) {
          await supabase.from('bluesky_oauth_states').delete().eq('key', key)
          return undefined
        }
        return data.state_data as object
      },
      async set(key: string, value: object) {
        const supabase = createServiceClient()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        await supabase.from('bluesky_oauth_states').upsert(
          { key, state_data: value, expires_at: expiresAt },
          { onConflict: 'key' }
        )
      },
      async del(key: string) {
        const supabase = createServiceClient()
        await supabase.from('bluesky_oauth_states').delete().eq('key', key)
      },
    },

    sessionStore: {
      async get(sub: string) {
        const supabase = createServiceClient()
        const { data } = await supabase
          .from('bluesky_oauth_sessions')
          .select('session_data')
          .eq('sub', sub)
          .single()
        if (!data) return undefined
        return data.session_data as object
      },
      async set(sub: string, value: object) {
        const supabase = createServiceClient()
        await supabase.from('bluesky_oauth_sessions').upsert(
          { sub, session_data: value, updated_at: new Date().toISOString() },
          { onConflict: 'sub' }
        )
      },
      async del(sub: string) {
        const supabase = createServiceClient()
        await supabase.from('bluesky_oauth_sessions').delete().eq('sub', sub)
      },
    },
  })
}

// Module-level singleton — safe for serverless since stores are DB-backed
let _client: NodeOAuthClient | null = null

export function getOAuthClient(): NodeOAuthClient {
  if (!_client) _client = buildClient()
  return _client
}
```

- [ ] **Commit**

```bash
git add lib/bluesky/oauth-client.ts
git commit -m "feat(bluesky): add NodeOAuthClient singleton with Supabase-backed stores"
```

---

## Task 7: Create client metadata route

**Files:**
- Create: `app/api/channels/bluesky/client-metadata/route.ts`

This JSON document is required by AT Protocol OAuth. The `client_id` IS this URL — BlueSky's authorization server fetches it to validate your app.

- [ ] **Create file**

```ts
export const dynamic = 'force-static'

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return Response.json({
    client_id:                  `${appUrl}/api/channels/bluesky/client-metadata`,
    client_name:                'Clout',
    client_uri:                 appUrl,
    redirect_uris:              [`${appUrl}/api/channels/bluesky/callback`],
    scope:                      'atproto transition:generic',
    grant_types:                ['authorization_code', 'refresh_token'],
    response_types:             ['code'],
    token_endpoint_auth_method: 'none',
    application_type:           'web',
    dpop_bound_access_tokens:   true,
  })
}
```

- [ ] **Smoke test**

Start the dev server and run:
```bash
curl http://localhost:3000/api/channels/bluesky/client-metadata | jq .
```

Expected: valid JSON with `client_id`, `redirect_uris`, `dpop_bound_access_tokens: true`.

- [ ] **Commit**

```bash
git add app/api/channels/bluesky/client-metadata/route.ts
git commit -m "feat(bluesky): add client metadata route for AT Protocol OAuth"
```

---

## Task 8: Create connect route

**Files:**
- Create: `app/api/channels/bluesky/connect/route.ts`

`GET /api/channels/bluesky/connect?handle=username.bsky.social`

The caller (UI modal) passes the BlueSky handle as a query param. The route discovers the user's PDS via their handle and redirects to the BlueSky auth URL. `workspaceId` is stashed in a short-lived HttpOnly cookie for the callback.

`signOAuthState` and `getSession` are existing utilities — same ones used by Twitter connect.

- [ ] **Create file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'
import { getOAuthClient } from '@/lib/bluesky/oauth-client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const handle = req.nextUrl.searchParams.get('handle')
  if (!handle) return NextResponse.json({ error: 'handle is required' }, { status: 400 })

  const state   = signOAuthState(session.workspaceId)
  const client  = getOAuthClient()

  let authUrl: URL
  try {
    authUrl = await client.authorize(handle.replace(/^@/, ''), { state })
  } catch (err) {
    console.error('[bluesky] authorize failed', { handle, err })
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
    return NextResponse.redirect(
      `${APP_URL}/settings/publishing?error=bluesky_handle_not_found`
    )
  }

  const res = NextResponse.redirect(authUrl.toString())
  res.cookies.set('bs_workspace', session.workspaceId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })
  return res
}
```

- [ ] **Commit**

```bash
git add app/api/channels/bluesky/connect/route.ts
git commit -m "feat(bluesky): add OAuth connect route"
```

---

## Task 9: Create callback route

**Files:**
- Create: `app/api/channels/bluesky/callback/route.ts`

After the user authorizes on BlueSky's site, they land here. This route:
1. Completes the OAuth exchange (via `client.callback()`)
2. Fetches the user's profile
3. Creates/updates the channel record
4. Stores credentials (DID as `accountId`) and profile metadata
5. Attaches `channel_id` + `workspace_id` to the session row

`createOrUpdateChannelByAccountId`, `upsertChannelCredential`, `verifyOAuthState`, and `createServiceClient` are all existing utilities.

- [ ] **Create file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { Agent } from '@atproto/api'
import { getOAuthClient } from '@/lib/bluesky/oauth-client'
import { verifyOAuthState } from '@/lib/oauth-state'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createServiceClient } from '@/lib/supabase/service'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const params      = req.nextUrl.searchParams
  const stateParam  = params.get('state')
  const oauthError  = params.get('error')

  if (oauthError || !stateParam) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=bluesky_denied`)
  }

  let workspaceId: string
  try {
    workspaceId = verifyOAuthState(stateParam).workspaceId
  } catch {
    const cookieWsId = req.cookies.get('bs_workspace')?.value
    if (!cookieWsId) {
      return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
    }
    workspaceId = cookieWsId
  }

  const client = getOAuthClient()

  let did: string
  let session: Awaited<ReturnType<typeof client.callback>>['session']
  try {
    const result = await client.callback(params)
    session      = result.session
    did          = session.did
  } catch (err) {
    console.error('[bluesky] callback failed', err)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed`)
  }

  const agent     = new Agent(session)
  const profileRes = await agent.getProfile({ actor: did }).catch(() => null)

  const handle      = profileRes?.data.handle      ?? did
  const displayName = profileRes?.data.displayName ?? null
  const description = profileRes?.data.description ?? null
  const avatar      = profileRes?.data.avatar      ?? null

  const { channelId } = await createOrUpdateChannelByAccountId({
    workspaceId,
    platform:        'bluesky',
    accountId:       did,
    accountType:     'personal',
    label:           `@${handle}`,
    profileImageUrl: avatar,
  })

  // Merge metadata into channels.config — read first to preserve existing keys
  const supabase = createServiceClient()
  const { data: existing } = await supabase
    .from('channels')
    .select('config')
    .eq('id', channelId)
    .single()

  await supabase.from('channels').update({
    config: {
      ...(existing?.config ?? {}),
      handle,
      displayName,
      description,
      char_limit:     300,
      connect_handle: handle,
    },
  }).eq('id', channelId)

  // Store DID in channel_credentials.account_id — this is the key used at publish time
  // access_token stores the DID as a lookup sentinel (actual auth is via oauth session)
  const credResult = await upsertChannelCredential({
    channelId,
    workspaceId,
    accessToken:  did,
    refreshToken: null,
    expiresAt:    null,
    accountId:    did,
    accountName:  displayName ?? handle,
    accountEmail: null,
  })
  if (!credResult.ok) {
    console.error('[bluesky] credential upsert failed', credResult.error)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=credential_db_failed`)
  }

  // Attach channel_id + workspace_id to the session row written by client.callback()
  await supabase.from('bluesky_oauth_sessions').update({
    channel_id:  channelId,
    workspace_id: workspaceId,
    updated_at:  new Date().toISOString(),
  }).eq('sub', did)

  const res = NextResponse.redirect(`${APP_URL()}/settings/publishing?connected=bluesky`)
  res.cookies.delete('bs_workspace')
  return res
}
```

- [ ] **Commit**

```bash
git add app/api/channels/bluesky/callback/route.ts
git commit -m "feat(bluesky): add OAuth callback route"
```

---

## Task 10: Create `lib/bluesky/client.ts`

**Files:**
- Create: `lib/bluesky/client.ts`

Session restore helper. Used by `postToBlueSky` at publish time. Converts any restore failure into a typed `token_expired` error so the existing `isAuthError()` check in `lib/domain/publishing.ts` handles it correctly and the post route returns 401.

- [ ] **Create file**

```ts
import { Agent } from '@atproto/api'
import { getOAuthClient } from './oauth-client'

export async function restoreAgent(did: string): Promise<Agent> {
  const client = getOAuthClient()
  try {
    const session = await client.restore(did)
    return new Agent(session)
  } catch (err) {
    console.error('[bluesky] OAuth restore failed', {
      did,
      reason: err instanceof Error ? err.message : String(err),
    })
    throw Object.assign(
      new Error('BlueSky session expired or revoked. Please reconnect your account.'),
      { code: 'token_expired', retryable: false, cause: err }
    )
  }
}
```

- [ ] **Commit**

```bash
git add lib/bluesky/client.ts
git commit -m "feat(bluesky): add session restore helper with typed auth error"
```

---

## Task 11: Create `lib/bluesky/richtext.ts` with tests

**Files:**
- Create: `lib/bluesky/richtext.ts`
- Create: `tests/bluesky/richtext.test.ts`

Rich text processing: detects language from Unicode script, then uses `@atproto/api`'s `RichText` class to detect @mentions, URLs, and #hashtags and convert them to AT Protocol facets.

- [ ] **Write the failing tests first**

```ts
// tests/bluesky/richtext.test.ts
import { describe, it, expect } from 'vitest'
import { detectLang } from '@/lib/bluesky/richtext'

describe('detectLang', () => {
  it('returns en for plain English text', () => {
    expect(detectLang('Hello world this is a test')).toBe('en')
  })

  it('returns zh for CJK text', () => {
    expect(detectLang('这是一个测试')).toBe('zh')
  })

  it('returns ko for Korean text', () => {
    expect(detectLang('안녕하세요 테스트입니다')).toBe('ko')
  })

  it('returns ar for Arabic text', () => {
    expect(detectLang('مرحبا بالعالم')).toBe('ar')
  })

  it('returns ru for Cyrillic text', () => {
    expect(detectLang('Привет мир')).toBe('ru')
  })

  it('returns he for Hebrew text', () => {
    expect(detectLang('שלום עולם')).toBe('he')
  })

  it('returns hi for Devanagari text', () => {
    expect(detectLang('नमस्ते दुनिया')).toBe('hi')
  })

  it('defaults to en for mixed or unknown scripts', () => {
    expect(detectLang('café résumé')).toBe('en')
  })
})
```

- [ ] **Run tests to confirm they fail**

```bash
npx vitest run tests/bluesky/richtext.test.ts 2>&1
```

Expected: FAIL — `detectLang` not found.

- [ ] **Create implementation**

```ts
// lib/bluesky/richtext.ts
import { RichText } from '@atproto/api'
import type { Agent } from '@atproto/api'

// Heuristic: detect primary script from Unicode ranges.
// Covers major non-Latin scripts. Defaults to 'en' for Latin/unknown.
export function detectLang(text: string): string {
  if (/[一-鿿぀-ヿㇰ-ㇿ]/.test(text)) return 'zh'
  if (/[가-힯]/.test(text)) return 'ko'
  if (/[؀-ۿ]/.test(text)) return 'ar'
  if (/[Ѐ-ӿ]/.test(text)) return 'ru'
  if (/[֐-׿]/.test(text)) return 'he'
  if (/[ऀ-ॿ]/.test(text)) return 'hi'
  return 'en'
}

export async function buildRichText(
  text: string,
  agent: Agent,
): Promise<{ text: string; facets: unknown[] | undefined; langs: string[] }> {
  const rt = new RichText({ text })
  await rt.detectFacets(agent)
  return {
    text:   rt.text,
    facets: rt.facets,
    langs:  [detectLang(rt.text)],
  }
}
```

- [ ] **Run tests to confirm they pass**

```bash
npx vitest run tests/bluesky/richtext.test.ts 2>&1
```

Expected: all 8 tests PASS.

- [ ] **Commit**

```bash
git add lib/bluesky/richtext.ts tests/bluesky/richtext.test.ts
git commit -m "feat(bluesky): add rich text processing with language detection"
```

---

## Task 12: Create `lib/bluesky/publish.ts` with tests

**Files:**
- Create: `lib/bluesky/publish.ts`
- Create: `tests/bluesky/publish.test.ts`

Core publish logic. `formatBlueSkyText` prepares content (trim, no hashtag injection — BlueSky culture discourages it). `postToBlueSky` validates length, restores agent, detects facets, posts.

- [ ] **Write failing tests first**

```ts
// tests/bluesky/publish.test.ts
import { describe, it, expect } from 'vitest'
import { formatBlueSkyText, postToBlueSky } from '@/lib/bluesky/publish'
import type { OutputContent } from '@/types/domain'

function makeContent(body: string | null): OutputContent {
  return { body, hashtags: [], keyPoints: [] } as unknown as OutputContent
}

describe('formatBlueSkyText', () => {
  it('returns trimmed body', () => {
    expect(formatBlueSkyText(makeContent('  hello world  '))).toBe('hello world')
  })

  it('returns empty string for null body', () => {
    expect(formatBlueSkyText(makeContent(null))).toBe('')
  })

  it('does not append hashtags', () => {
    const content = { body: 'test post', hashtags: ['foo', 'bar'] } as unknown as OutputContent
    expect(formatBlueSkyText(content)).toBe('test post')
  })
})

describe('postToBlueSky — content_too_long validation', () => {
  it('throws content_too_long before any network call when text exceeds 300 chars', async () => {
    const longBody = 'x'.repeat(301)
    await expect(
      postToBlueSky('did:plc:test', makeContent(longBody))
    ).rejects.toMatchObject({ code: 'content_too_long' })
  })

  it('throws content_too_long with character count in message', async () => {
    const longBody = 'x'.repeat(305)
    await expect(
      postToBlueSky('did:plc:test', makeContent(longBody))
    ).rejects.toThrow('305 chars')
  })
})
```

- [ ] **Run tests to confirm they fail**

```bash
npx vitest run tests/bluesky/publish.test.ts 2>&1
```

Expected: FAIL — `formatBlueSkyText` not found.

- [ ] **Create implementation**

```ts
// lib/bluesky/publish.ts
import type { OutputContent } from '@/types/domain'
import { buildRichText } from './richtext'
import { restoreAgent } from './client'

export function formatBlueSkyText(content: OutputContent): string {
  return content.body?.trim() ?? ''
}

export async function postToBlueSky(
  did: string,
  content: OutputContent,
): Promise<{ postId: string }> {
  const text = formatBlueSkyText(content)

  if (text.length > 300) {
    throw Object.assign(
      new Error(
        `BlueSky post exceeds 300-character limit (${text.length} chars). Please shorten the content and try again.`
      ),
      { code: 'content_too_long', retryable: false }
    )
  }

  const agent = await restoreAgent(did)
  const { text: richText, facets, langs } = await buildRichText(text, agent)

  const response = await agent.post({
    text:   richText,
    facets: facets as Parameters<typeof agent.post>[0]['facets'],
    langs,
  })

  return { postId: response.uri }
}
```

- [ ] **Run tests to confirm they pass**

```bash
npx vitest run tests/bluesky/publish.test.ts 2>&1
```

Expected: all 5 tests PASS.

- [ ] **Commit**

```bash
git add lib/bluesky/publish.ts tests/bluesky/publish.test.ts
git commit -m "feat(bluesky): add publish module with content validation"
```

---

## Task 13: Update `lib/domain/channels.ts` and `lib/domain/publishing.ts`

**Files:**
- Modify: `lib/domain/channels.ts`
- Modify: `lib/domain/publishing.ts`

- [ ] **Add bluesky to DEFAULT_CONFIG in `lib/domain/channels.ts`**

Find `DEFAULT_CONFIG`:
```ts
const DEFAULT_CONFIG: Partial<Record<ChannelPlatform, Record<string, unknown>>> = {
  linkedin:  { char_limit: 3000, hashtag_count: 5 },
  twitter:   { char_limit: 280 },
  threads:   { char_limit: 500, soft_limit: 200 },
  facebook:  {},
  instagram: {},
  tiktok:    {},
  newsletter: {},
}
```

Add bluesky:
```ts
const DEFAULT_CONFIG: Partial<Record<ChannelPlatform, Record<string, unknown>>> = {
  linkedin:  { char_limit: 3000, hashtag_count: 5 },
  twitter:   { char_limit: 280 },
  threads:   { char_limit: 500, soft_limit: 200 },
  facebook:  {},
  instagram: {},
  tiktok:    {},
  newsletter: {},
  bluesky:   { char_limit: 300 },
}
```

- [ ] **Add `publishBlueSkyOutput` to `lib/domain/publishing.ts`**

At the top of the file, add the import:
```ts
import { postToBlueSky } from '@/lib/bluesky/publish'
```

After `publishInstagramOutput` (near the bottom of the file), add:
```ts
// ─── BlueSky ──────────────────────────────────────────────────────────────────

export async function publishBlueSkyOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a BlueSky channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('BlueSky account not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  const did = credResult.data.accountId
  if (!did) {
    throw Object.assign(
      new Error('BlueSky account ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  return postToBlueSky(did, output.content as OutputContent)
}
```

- [ ] **Add bluesky case to `publishOutput()` dispatch**

Find the switch statement in `publishOutput()`. It ends with:
```ts
    default:
      throw Object.assign(
        new Error(`Publishing not supported for platform: ${channel.platform}`),
        { code: 'unsupported_platform', retryable: false }
      )
```

Add before `default`:
```ts
    case 'bluesky': {
      const { postId } = await publishBlueSkyOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: `https://bsky.app/profile/${postId.split('/')[2]}/post/${postId.split('/').pop()}` }
    }
```

- [ ] **Type check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: no new errors.

- [ ] **Commit**

```bash
git add lib/domain/channels.ts lib/domain/publishing.ts
git commit -m "feat(bluesky): add publishBlueSkyOutput and dispatch case"
```

---

## Task 14: Create post route

**Files:**
- Create: `app/api/channels/bluesky/post/route.ts`

Identical structure to `app/api/channels/twitter/post/route.ts` — auth, lock, publish, mark. Returns 422 for `content_too_long` (unique to BlueSky), 401 for `token_expired`, 502 otherwise.

- [ ] **Create file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { publishBlueSkyOutput, acquirePublishLock, markPublished, markFailed } from '@/lib/domain/publishing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { outputId } = body as { outputId?: string }
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const outputResult = await getOutput(outputId)
  if (!outputResult.ok || outputResult.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  const output = outputResult.data

  if (output.providerPostId) {
    return NextResponse.json({ ok: true, postId: output.providerPostId, alreadyPublished: true })
  }

  const lock = await acquirePublishLock(outputId)
  if (!lock.ok) {
    return NextResponse.json(
      { error: 'Publish already in progress', code: 'publish_in_progress' },
      { status: 409 },
    )
  }

  try {
    const { postId } = await publishBlueSkyOutput(output)
    await markPublished(outputId, postId)
    return NextResponse.json({ ok: true, postId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed'
    const code    = (err as { code?: string }).code ?? 'unknown'
    await markFailed(outputId, message)
    const httpStatus =
      code === 'token_expired'    ? 401 :
      code === 'content_too_long' ? 422 :
      502
    return NextResponse.json({ error: message, code }, { status: httpStatus })
  }
}
```

- [ ] **Commit**

```bash
git add app/api/channels/bluesky/post/route.ts
git commit -m "feat(bluesky): add publish post route"
```

---

## Task 15: Create cleanup job

**Files:**
- Create: `lib/trigger/jobs/cleanup-bluesky-oauth-states.ts`

`bluesky_oauth_states` rows expire after 10 minutes but are never auto-deleted. This daily job purges them. Follows the `schedules.task` pattern used by `lib/trigger/jobs/publish-scheduled.ts`. The trigger.config.ts already points at `lib/trigger/jobs` so this file is auto-discovered.

- [ ] **Create file**

```ts
import { schedules, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

export const cleanupBlueSkyOAuthStatesTask = schedules.task({
  id:   'cleanup-bluesky-oauth-states',
  cron: '0 3 * * *',  // 3am UTC daily
  run: async () => {
    const supabase   = createServiceClient()
    const cutoff     = new Date().toISOString()
    const { count, error } = await supabase
      .from('bluesky_oauth_states')
      .delete()
      .lt('expires_at', cutoff)
      .select('*', { count: 'exact', head: true })

    if (error) {
      await logger.error('cleanup-bluesky-oauth-states: delete failed', { error: error.message })
      throw new Error(error.message)
    }

    await logger.info('cleanup-bluesky-oauth-states: complete', { deleted: count ?? 0 })
  },
})
```

- [ ] **Commit**

```bash
git add lib/trigger/jobs/cleanup-bluesky-oauth-states.ts
git commit -m "feat(bluesky): add daily cleanup job for expired OAuth states"
```

---

## Task 16: Create `lib/syndication/platforms/bluesky.ts`

**Files:**
- Create: `lib/syndication/platforms/bluesky.ts`

Match the full shape of `X_PLATFORM_MODEL` — `platform`, `rhetoricalEnvironment`, `preWritingFramework`, `structuralRules`, `lengthTarget`, `antiPatterns`. Check `lib/syndication/types/platform.ts` for any fields added since this plan was written.

- [ ] **Create file**

```ts
export const BLUESKY_PLATFORM_MODEL = {
  platform: 'bluesky' as const,

  rhetoricalEnvironment: `BlueSky is a text-first network built by people who left Twitter seeking more genuine discourse. The community skews intellectual, curious, and actively skeptical of corporate/hustle content. Authenticity is valued over virality. Hashtag spam is disliked — the culture expects you to say something real, not optimize for reach. @mentions and links are first-class. The feed rewards a single well-formed thought over a performative content strategy.`,

  preWritingFramework: `Before writing, complete this analysis:

1. **Single most valuable idea** — What is the one specific thing worth saying? Not a summary of the source. The one insight that would make a thoughtful reader stop scrolling.

2. **Authenticity check** — Would this read as a real person's thought, or as "content"? BlueSky readers are unusually good at detecting manufactured authenticity. If it sounds like a brand, rewrite it.

3. **Compress to 300 characters** — Every word must earn its place. Restate the idea until you can't make it shorter without losing meaning.

Only write the post after completing this analysis.`,

  structuralRules: [
    'Hard limit: 300 characters — every character must earn its place',
    'Say one thing, clearly. BlueSky rewards specificity over comprehensiveness',
    'Write as a real person with a perspective, not as a content strategist',
    'Links and @mentions are embraced — use them when they add genuine value',
    'No hashtag spam — if you use one, it must serve genuine discovery, not reach optimization',
    'Conversational and direct — the best BlueSky posts sound like someone thinking out loud',
    'Trust the reader — do not over-explain or hedge unnecessarily',
    'Front-load the idea — the first sentence determines whether anyone reads the second',
  ],

  lengthTarget: 'Maximum 300 characters. Single post only — no threads. Compress until you reach the essential idea. A tight 200-character post is better than a padded 299-character one.',

  antiPatterns: [
    'Generic inspiration — "Consistency is the key to success" — everyone knows this, say something specific',
    'Corporate or hustle-bro tone — no "leverage", "synergy", "crushing it", "building in public"',
    'Hashtag stacking — zero hashtags is usually correct',
    'Performative humility — "I just wanted to share..." "I may be wrong but..."',
    'Content-farming openers — "A quick thread", "Hot take:", "Unpopular opinion:"',
    'Filler sentences that set up the point instead of stating it',
    'Going over 300 characters under any circumstances',
    'Ending with "What do you think?" or any weak open solicitation',
    'AI-sounding phrasing — "In today\'s world", "It\'s important to note", "Key takeaways"',
  ],
}
```

- [ ] **Commit**

```bash
git add lib/syndication/platforms/bluesky.ts
git commit -m "feat(bluesky): add platform behavior model"
```

---

## Task 17: Update syndication registry + test

**Files:**
- Modify: `lib/syndication/registry.ts`
- Create: `tests/bluesky/registry.test.ts`

- [ ] **Write the failing test first**

```ts
// tests/bluesky/registry.test.ts
import { describe, it, expect } from 'vitest'
import { PLATFORM_REGISTRY } from '@/lib/syndication/registry'

describe('PLATFORM_REGISTRY — bluesky', () => {
  it('is registered', () => {
    expect(PLATFORM_REGISTRY['bluesky']).toBeDefined()
  })

  it('has correct identity', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.identity.id).toBe('bluesky')
    expect(def.identity.label).toBe('BlueSky')
  })

  it('has correct generation config', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.generation.maxPostLength).toBe(300)
    expect(def.generation.softPostLength).toBe(270)
    expect(def.generation.maxTokens).toBe(150)
  })

  it('has a behavior model with required fields', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.model.rhetoricalEnvironment).toBeTruthy()
    expect(def.model.structuralRules.length).toBeGreaterThan(0)
    expect(def.model.antiPatterns.length).toBeGreaterThan(0)
    expect(def.model.lengthTarget).toBeTruthy()
  })

  it('does not support threads (v1)', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.capabilities.supportsThreads).toBe(false)
  })

  it('supports platform scheduling', () => {
    const def = PLATFORM_REGISTRY['bluesky']
    expect(def.capabilities.platformScheduling).toBe(true)
  })
})
```

- [ ] **Run to confirm failure**

```bash
npx vitest run tests/bluesky/registry.test.ts 2>&1
```

Expected: FAIL — `bluesky` key missing from registry.

- [ ] **Register BlueSky in `lib/syndication/registry.ts`**

Add import at the top:
```ts
import { BLUESKY_PLATFORM_MODEL } from './platforms/bluesky'
```

Add entry to `PLATFORM_REGISTRY`:
```ts
bluesky: {
  identity: {
    id:         'bluesky',
    label:      'BlueSky',
    descriptor: 'Text-first · authentic · discourse-native',
  },
  model:        BLUESKY_PLATFORM_MODEL as PlatformBehaviorModel,
  capabilities: {
    supportsThreads:   false,
    supportsMedia:     false,
    supportsCarousel:  false,
    supportsPolls:     false,
    nativeScheduling:  false,
    platformScheduling: true,
  },
  generation: {
    maxTokens:     150,
    maxPostLength: 300,
    softPostLength: 270,
  },
},
```

- [ ] **Run tests to confirm they pass**

```bash
npx vitest run tests/bluesky/registry.test.ts 2>&1
```

Expected: all 6 tests PASS.

- [ ] **Run the full registry compat suite to check for regressions**

```bash
npx vitest run lib/syndication/__tests__/registry.compat.test.ts 2>&1
```

Expected: all existing tests still PASS.

- [ ] **Commit**

```bash
git add lib/syndication/registry.ts tests/bluesky/registry.test.ts
git commit -m "feat(bluesky): register bluesky in syndication registry"
```

---

## Task 18: Update distribution platform registry

**Files:**
- Modify: `lib/distribution/platform-registry.ts`

- [ ] **Add bluesky entry**

In `DISTRIBUTION_PLATFORMS`, add:
```ts
bluesky: { label: 'BlueSky', defaultUTM: { source: 'bluesky', medium: 'social' } },
```

- [ ] **Type check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -10
```

Expected: no errors.

- [ ] **Commit**

```bash
git add lib/distribution/platform-registry.ts
git commit -m "feat(bluesky): add bluesky to distribution platform registry"
```

---

## Task 19: Update publishing settings UI

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`

Four changes: BlueSky icon, handle-input modal, SOCIAL_PLATFORMS entry, toast handler. Also remove `'Bluesky'` from the `PLANNED` array since it's no longer planned — it's live.

- [ ] **Add `BlueSkyIcon` SVG component**

After the last existing icon component (before `// ─── Static data`), add:

```tsx
function BlueSkyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 530" fill="currentColor" className={className}>
      <path d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.38-3.69-10.832-3.708-7.896-.017-2.935-1.193.516-3.707 7.896-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.45-163.25-81.433C20.153 217.613 10 86.535 10 68.825c0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
  )
}
```

- [ ] **Add `BlueSkyConnectModal` component**

After `LinkedInTypePicker` (around line 200), add:

```tsx
function BlueSkyConnectModal({ onClose }: { onClose: () => void }) {
  const [handle, setHandle] = useState('')
  const [error, setError]   = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = handle.trim().replace(/^@/, '')
    if (!normalized) {
      setError('Enter your BlueSky handle')
      return
    }
    window.location.href = `/api/channels/bluesky/connect?handle=${encodeURIComponent(normalized)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">Connect BlueSky</h2>
        <p className="mb-4 text-sm text-zinc-500">Enter your BlueSky handle to connect your account.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="@username.bsky.social"
            value={handle}
            onChange={e => { setHandle(e.target.value); setError('') }}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700">
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Add state and SOCIAL_PLATFORMS entry**

In the component's state declarations (near `showLinkedInPicker`), add:
```tsx
const [showBlueSkyModal, setShowBlueSkyModal] = useState(false)
```

In `SOCIAL_PLATFORMS`, add the bluesky entry (note `connectHref: null` — connect is handled via the modal):
```ts
{
  key:            'bluesky',
  name:           'BlueSky',
  tagline:        'Open social distribution',
  iconColorClass: 'text-[#0085ff]',
  Icon:           BlueSkyIcon,
  connectHref:    null,
},
```

Remove `'Bluesky'` from the `PLANNED` array.

- [ ] **Add custom BlueSky PlatformCard rendering**

In the `SOCIAL_PLATFORMS.map(...)` block, the current code renders PlatformCard with `connectHref` directly. BlueSky needs to intercept the connect action and show the modal instead. Find where LinkedIn has its special handling (it also uses `connectHref: null` with a modal).

The LinkedIn block uses something like:
```tsx
connectHref={!isLinkedIn ? guardedHref(connectHref) : undefined}
onConnectClick={isLinkedIn ? () => setShowLinkedInPicker(true) : undefined}
```

Check `PlatformCard`'s props — it likely has an `onConnectClick` prop. Apply the same pattern for BlueSky. In the `SOCIAL_PLATFORMS.map`:

```tsx
const isBlueSky = key === 'bluesky'
// ...
<PlatformCard
  // ...
  connectHref={!isBlueSky && !isLinkedIn ? guardedHref(connectHref) : undefined}
  onConnectClick={isBlueSky ? () => setShowBlueSkyModal(true) : isLinkedIn ? () => setShowLinkedInPicker(true) : undefined}
  // ...
/>
```

Read the actual `PlatformCard` props carefully before making this change — the exact prop names may differ. If there's no `onConnectClick`, check how LinkedIn is handled and mirror that exactly.

- [ ] **Add toast handler and modal render**

In the `connected` check (around line 447), add:
```ts
else if (connected === 'bluesky') flash('BlueSky connected.', true)
```

Add the modal render (near the LinkedIn modal render):
```tsx
{showBlueSkyModal && <BlueSkyConnectModal onClose={() => setShowBlueSkyModal(false)} />}
```

Also handle `?reconnect=bluesky` for reconnect flow. When `searchParams.get('reconnect') === 'bluesky'`, auto-open the modal with the stored handle pre-filled. Add to the `useEffect` that handles query params:
```ts
if (searchParams.get('reconnect') === 'bluesky') {
  setShowBlueSkyModal(true)
}
```

- [ ] **Type check and visual verify**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: no errors.

Start the dev server and navigate to `/[your-workspace]/settings/publishing`. Verify:
- BlueSky appears in the social platforms grid with the butterfly icon
- Clicking Connect opens the handle modal
- The `PLANNED` section no longer shows 'Bluesky'

- [ ] **Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx"
git commit -m "feat(bluesky): add BlueSky UI to publishing settings"
```

---

## Task 20: Full test suite + final type check

- [ ] **Run all BlueSky tests**

```bash
npx vitest run tests/bluesky/ 2>&1
```

Expected: all tests in `richtext.test.ts`, `publish.test.ts`, `registry.test.ts` PASS.

- [ ] **Run full test suite for regressions**

```bash
npx vitest run 2>&1
```

Expected: no regressions. The only new failures should be zero.

- [ ] **Final type check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: zero errors.

- [ ] **Commit**

If any minor fixes were needed during the above:
```bash
git add -p
git commit -m "fix(bluesky): type and test cleanup"
```

---

## Verification (end-to-end)

After completing all tasks:

1. **Client metadata**: `curl http://localhost:3000/api/channels/bluesky/client-metadata | jq .`
   - Expected: valid JSON with `client_id`, `redirect_uris`, `dpop_bound_access_tokens: true`

2. **OAuth connect**: Navigate to `/settings/publishing`, click Connect BlueSky, enter a real handle
   - Expected: redirects to `bsky.social` OAuth screen

3. **OAuth callback**: Complete auth on BlueSky
   - Expected: redirected to `/settings/publishing?connected=bluesky`, "BlueSky connected." toast
   - Confirm: `channel` row exists with `platform = 'bluesky'`, `account_id = 'did:plc:...'`
   - Confirm: `bluesky_oauth_sessions` row exists keyed by DID with `channel_id` populated
   - Confirm: `channels.config` has `handle`, `displayName`, `connect_handle`

4. **Publish**: From a studio output with BlueSky channel selected, trigger publish
   - Expected: post appears on BlueSky with facets for any links/mentions
   - Expected: `publish_logs` row written

5. **Content too long**: Manually call the post route with an output whose body is 301+ chars
   - Expected: 422 response with `code: 'content_too_long'`

6. **Reconnect CTA**: Delete `bluesky_oauth_sessions` row for a connected account, trigger publish
   - Expected: 401 response, output marked failed, reconnect CTA visible in PlatformCard

7. **Rich text facets**: Publish a post containing a URL — confirm the link is clickable on BlueSky (not just plain text)

8. **Generation**: Open syndication engine, confirm BlueSky appears as a platform option
