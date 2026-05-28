# Bing Webmaster Tools — Search Performance Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a BingWebmasterCard to the Search Performance section of `/settings/publishing`, with full Microsoft OAuth, encrypted token storage, site selection, and live keyword metrics.

**Architecture:** Microsoft Entra ID OAuth stores tokens in the existing `analytics_connections` table under provider `'bing_wmt'`. A dedicated Bing client handles Microsoft-specific token refresh independently from the Google client. The card mirrors GoogleSearchConsoleCard exactly in structure and UX.

**Tech Stack:** Next.js App Router, Supabase (analytics_connections + analytics_properties tables), Microsoft Identity Platform OAuth 2.0, Bing Webmaster Tools API v3 (`ssl.bing.com/webmaster/api.svc/json/`), React (client component), Tailwind CSS.

---

## File Map

| Action | Path |
|---|---|
| **Create** | `supabase/migrations/20260528004_bing_wmt_provider.sql` |
| **Modify** | `lib/analytics/connections.ts` |
| **Create** | `lib/analytics/bing/client.ts` |
| **Create** | `lib/analytics/bing/queries.ts` |
| **Create** | `app/api/integrations/bing/connect/route.ts` |
| **Create** | `app/api/integrations/bing/callback/route.ts` |
| **Create** | `app/api/integrations/bing/search/route.ts` |
| **Create** | `app/api/integrations/bing/select-site/route.ts` |
| **Create** | `app/api/integrations/bing/disconnect/route.ts` |
| **Create** | `components/publishing/BingWebmasterCard.tsx` |
| **Modify** | `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx` |

---

## Task 1: Database migration — extend check constraints

The `analytics_connections` and `analytics_properties` tables have check constraints that only allow `('ga4', 'gsc')` and `('ga4_property', 'gsc_site')`. Postgres requires dropping and recreating check constraints to extend them.

**Files:**
- Create: `supabase/migrations/20260528004_bing_wmt_provider.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260528004_bing_wmt_provider.sql

-- Extend analytics_connections.provider to include bing_wmt
alter table analytics_connections
  drop constraint analytics_connections_provider_check;

alter table analytics_connections
  add constraint analytics_connections_provider_check
  check (provider in ('ga4', 'gsc', 'bing_wmt'));

-- Extend analytics_properties.property_type to include bing_wmt_site
alter table analytics_properties
  drop constraint analytics_properties_property_type_check;

alter table analytics_properties
  add constraint analytics_properties_property_type_check
  check (property_type in ('ga4_property', 'gsc_site', 'bing_wmt_site'));
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260528004_bing_wmt_provider.sql
git commit -m "feat: extend analytics check constraints for bing_wmt provider"
```

---

## Task 2: Extend TypeScript types in connections.ts

`getAnalyticsConnection`, `upsertAnalyticsConnection`, `deleteAnalyticsConnection`, `upsertAnalyticsProperty`, and `getAnalyticsProperty` all have hard-coded union types. Extend them to accept the Bing values. Do NOT touch `getAccessToken` — it is Google-specific and must stay `'ga4' | 'gsc'`.

**Files:**
- Modify: `lib/analytics/connections.ts`

- [ ] **Step 1: Update function signatures**

Change every occurrence of `'ga4' | 'gsc'` (provider param) to `'ga4' | 'gsc' | 'bing_wmt'` and every `'ga4_property' | 'gsc_site'` (property_type param) to `'ga4_property' | 'gsc_site' | 'bing_wmt_site'`.

The file currently reads:

```typescript
export async function getAnalyticsConnection(workspaceId: string, provider: 'ga4' | 'gsc') {
```

```typescript
export async function upsertAnalyticsConnection(row: {
  workspace_id: string
  provider: 'ga4' | 'gsc'
```

```typescript
export async function deleteAnalyticsConnection(workspaceId: string, provider: 'ga4' | 'gsc') {
```

```typescript
export async function upsertAnalyticsProperty(row: {
  workspace_id: string
  property_type: 'ga4_property' | 'gsc_site'
```

```typescript
export async function getAnalyticsProperty(workspaceId: string, propertyType: 'ga4_property' | 'gsc_site') {
```

Change them to:

```typescript
export async function getAnalyticsConnection(workspaceId: string, provider: 'ga4' | 'gsc' | 'bing_wmt') {
```

```typescript
export async function upsertAnalyticsConnection(row: {
  workspace_id: string
  provider: 'ga4' | 'gsc' | 'bing_wmt'
```

```typescript
export async function deleteAnalyticsConnection(workspaceId: string, provider: 'ga4' | 'gsc' | 'bing_wmt') {
```

```typescript
export async function upsertAnalyticsProperty(row: {
  workspace_id: string
  property_type: 'ga4_property' | 'gsc_site' | 'bing_wmt_site'
```

```typescript
export async function getAnalyticsProperty(workspaceId: string, propertyType: 'ga4_property' | 'gsc_site' | 'bing_wmt_site') {
```

Leave `getAccessToken` signature unchanged — it is only called by Google paths.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/connections.ts
git commit -m "feat: extend analytics connection types for bing_wmt provider"
```

---

## Task 3: Bing API client with Microsoft token refresh

Bing uses Microsoft's token endpoint, not Google's. This module owns all raw Bing API access and token refresh.

**Files:**
- Create: `lib/analytics/bing/client.ts`

- [ ] **Step 1: Create the Bing client**

```typescript
// lib/analytics/bing/client.ts
import { getAnalyticsConnection, upsertAnalyticsConnection } from '@/lib/analytics/connections'

const BING_API = 'https://ssl.bing.com/webmaster/api.svc/json'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

async function getBingAccessToken(workspaceId: string): Promise<string> {
  const conn = await getAnalyticsConnection(workspaceId, 'bing_wmt')
  if (!conn) throw new Error('No Bing Webmaster Tools connection found')

  const now = Math.floor(Date.now() / 1000)
  if (conn.expires_at && conn.expires_at > now + 60) {
    return conn.access_token
  }

  if (!conn.refresh_token) throw new Error('No Bing refresh token — reconnect required')

  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: conn.refresh_token,
      client_id:     process.env.BING_CLIENT_ID!,
      client_secret: process.env.BING_CLIENT_SECRET!,
      scope:         'https://webmaster.api.bing.com/.default offline_access',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Bing token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string }
  if (!data.access_token) throw new Error('Bing token refresh returned no access_token')

  const newExpiresAt = now + data.expires_in

  await upsertAnalyticsConnection({
    workspace_id:  workspaceId,
    provider:      'bing_wmt',
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? conn.refresh_token,
    expires_at:    newExpiresAt,
    connected_by:  conn.connected_by,
  })

  return data.access_token
}

export async function bingGet<T>(workspaceId: string, method: string, params?: Record<string, string>): Promise<T> {
  const token = await getBingAccessToken(workspaceId)
  const url = new URL(`${BING_API}/${method}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bing API error ${res.status} (${method}): ${text}`)
  }

  const json = await res.json() as { d: T }
  return json.d
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/bing/client.ts
git commit -m "feat: Bing Webmaster Tools API client with Microsoft token refresh"
```

---

## Task 4: Bing query helpers

**Files:**
- Create: `lib/analytics/bing/queries.ts`

- [ ] **Step 1: Create the queries module**

```typescript
// lib/analytics/bing/queries.ts
import { bingGet } from './client'

export interface BingSite {
  siteUrl:  string
  verified: boolean
}

export interface BingKeyword {
  query:       string
  clicks:      number
  impressions: number
  position:    number
}

interface RawSite {
  Url:      string
  Verified: boolean
}

interface RawKeyword {
  Query:       string
  Clicks:      number
  Impressions: number
  Position:    number
  Ctr:         number
}

export async function listBingSites(workspaceId: string): Promise<BingSite[]> {
  const data = await bingGet<{ GetUserSitesResult: RawSite[] | null }>(
    workspaceId,
    'GetUserSites',
  )
  return (data.GetUserSitesResult ?? []).map(s => ({
    siteUrl:  s.Url,
    verified: s.Verified,
  }))
}

export async function fetchBingKeywords(
  workspaceId: string,
  siteUrl:     string,
  startDate:   string,
  endDate:     string,
): Promise<BingKeyword[]> {
  interface KeywordsResult {
    GetTopKeywordsResult: {
      KeywordList:  RawKeyword[] | null
      TotalCount:   number
    } | null
  }

  const data = await bingGet<KeywordsResult>(workspaceId, 'GetTopKeywords', {
    siteUrl,
    startDate,
    endDate,
    rows:        '10',
    page:        '0',
    country:     '',
    language:    '',
    currentPage: '0',
  })

  const list = data.GetTopKeywordsResult?.KeywordList ?? []
  return list.map(k => ({
    query:       k.Query,
    clicks:      k.Clicks,
    impressions: k.Impressions,
    position:    k.Position,
  }))
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/bing/queries.ts
git commit -m "feat: Bing Webmaster Tools query helpers"
```

---

## Task 5: OAuth connect route

**Files:**
- Create: `app/api/integrations/bing/connect/route.ts`

- [ ] **Step 1: Create the connect route**

```typescript
// app/api/integrations/bing/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawReturnTo = req.nextUrl.searchParams.get('returnTo')
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') ? rawReturnTo : undefined

  const state = signOAuthState(session.workspaceId, undefined, returnTo)
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/bing/callback`

  const params = new URLSearchParams({
    client_id:     process.env.BING_CLIENT_ID!,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://webmaster.api.bing.com/.default offline_access',
    state,
    response_mode: 'query',
  })

  return NextResponse.redirect(`${MICROSOFT_AUTH_URL}?${params}`)
}
```

- [ ] **Step 2: Confirm env vars are set**

In `.env.local`, verify both are present (even with placeholder values for local dev):
```
BING_CLIENT_ID=your-azure-app-client-id
BING_CLIENT_SECRET=your-azure-client-secret
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/integrations/bing/connect/route.ts
git commit -m "feat: Bing Webmaster Tools OAuth connect route"
```

---

## Task 6: OAuth callback route

**Files:**
- Create: `app/api/integrations/bing/callback/route.ts`

- [ ] **Step 1: Create the callback route**

```typescript
// app/api/integrations/bing/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertAnalyticsConnection } from '@/lib/analytics/connections'

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=bing_denied`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=bing_missing_params`)
  }

  let workspaceId: string
  let returnTo: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId   = payload.workspaceId
    returnTo      = payload.returnTo ?? '/settings/publishing'
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=bing_invalid_state`)
  }

  const session = await getSession()
  if (!session || session.workspaceId !== workspaceId) {
    return NextResponse.redirect(`${APP_URL}/settings/publishing?error=bing_workspace_mismatch`)
  }

  const redirectUri = `${APP_URL}/api/integrations/bing/callback`

  try {
    const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.BING_CLIENT_ID!,
        client_secret: process.env.BING_CLIENT_SECRET!,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
        scope:         'https://webmaster.api.bing.com/.default offline_access',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_token_exchange_failed`)
    }

    const tokens = await tokenRes.json() as {
      access_token:  string
      refresh_token: string
      expires_in:    number
    }

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

    await upsertAnalyticsConnection({
      workspace_id:  workspaceId,
      provider:      'bing_wmt',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at:    expiresAt,
      connected_by:  session.userId,
    })
  } catch {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_server_error`)
  }

  return NextResponse.redirect(`${APP_URL}${returnTo}?connected=bing`)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/integrations/bing/callback/route.ts
git commit -m "feat: Bing Webmaster Tools OAuth callback route"
```

---

## Task 7: Search data route

Returns `{ connected, sites, selectedSiteUrl, summary }` — same shape the card expects.

**Files:**
- Create: `app/api/integrations/bing/search/route.ts`

- [ ] **Step 1: Create the search route**

```typescript
// app/api/integrations/bing/search/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAnalyticsConnection, getAnalyticsProperty } from '@/lib/analytics/connections'
import { listBingSites, fetchBingKeywords } from '@/lib/analytics/bing/queries'

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'bing_wmt')
  if (!conn) return NextResponse.json({ connected: false })

  try {
    const [sites, selected] = await Promise.all([
      listBingSites(session.workspaceId),
      getAnalyticsProperty(session.workspaceId, 'bing_wmt_site'),
    ])

    const selectedSiteUrl = selected?.property_id ?? null

    if (!selectedSiteUrl) {
      return NextResponse.json({ connected: true, sites, selectedSiteUrl: null, summary: null })
    }

    const keywords = await fetchBingKeywords(
      session.workspaceId,
      selectedSiteUrl,
      dateStr(28),
      dateStr(1),
    )

    const totalClicks      = keywords.reduce((s, k) => s + k.clicks, 0)
    const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0)
    const avgCtr           = totalImpressions > 0 ? totalClicks / totalImpressions : 0

    const topQueries = keywords
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)

    return NextResponse.json({
      connected: true,
      sites,
      selectedSiteUrl,
      summary: { totalClicks, totalImpressions, avgCtr, topQueries, windowDays: 28 },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/integrations/bing/search/route.ts
git commit -m "feat: Bing Webmaster Tools search data route"
```

---

## Task 8: Select-site and disconnect routes

**Files:**
- Create: `app/api/integrations/bing/select-site/route.ts`
- Create: `app/api/integrations/bing/disconnect/route.ts`

- [ ] **Step 1: Create select-site**

```typescript
// app/api/integrations/bing/select-site/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { upsertAnalyticsProperty } from '@/lib/analytics/connections'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { siteUrl?: string }
  if (!body.siteUrl) return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })

  await upsertAnalyticsProperty({
    workspace_id:  session.workspaceId,
    property_type: 'bing_wmt_site',
    property_id:   body.siteUrl,
    property_name: body.siteUrl,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create disconnect**

```typescript
// app/api/integrations/bing/disconnect/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteAnalyticsConnection } from '@/lib/analytics/connections'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteAnalyticsConnection(session.workspaceId, 'bing_wmt')
  } catch (err) {
    console.error('Failed to disconnect Bing WMT:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/integrations/bing/select-site/route.ts app/api/integrations/bing/disconnect/route.ts
git commit -m "feat: Bing Webmaster Tools select-site and disconnect routes"
```

---

## Task 9: BingWebmasterCard component

Mirrors `GoogleSearchConsoleCard` exactly in structure. Microsoft blue `#0078D4` for the icon accent, "Connect Microsoft" CTA.

**Files:**
- Create: `components/publishing/BingWebmasterCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/publishing/BingWebmasterCard.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { TrendingUp, MousePointerClick, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BingSite { siteUrl: string; verified: boolean }

interface TopQuery {
  query:       string
  clicks:      number
  impressions: number
  position:    number
}

interface Summary {
  totalClicks:      number
  totalImpressions: number
  avgCtr:           number
  topQueries:       TopQuery[]
  windowDays:       number
}

interface BingState {
  connected:       boolean
  sites:           BingSite[]
  selectedSiteUrl: string | null
  summary:         Summary | null
}

function BingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="4" fill="#0078D4" opacity="0.1" />
      <path
        d="M6 4v16l4-1.5V13l5.5 3.5L20 14l-6-3.5 2-7.5L6 4z"
        fill="#0078D4"
        fillOpacity="0.9"
      />
    </svg>
  )
}

function StatPill({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-zinc-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-zinc-400" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums text-zinc-900">{value}</span>
    </div>
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function BingWebmasterCard() {
  const pathname = usePathname()

  const [state, setState]     = useState<BingState>({ connected: false, sites: [], selectedSiteUrl: null, summary: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/bing/search')
      if (res.ok) setState(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSelectSite(siteUrl: string) {
    setSaving(true)
    const res = await fetch('/api/integrations/bing/select-site', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ siteUrl }),
    })
    setSaving(false)
    if (res.ok) {
      setLoading(true)
      setState({ connected: false, sites: [], selectedSiteUrl: null, summary: null })
      await load()
    }
  }

  async function handleDisconnect() {
    await fetch('/api/integrations/bing/disconnect', { method: 'POST' })
    setState({ connected: false, sites: [], selectedSiteUrl: null, summary: null })
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 rounded bg-zinc-100" />
            <div className="h-3 w-64 rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    )
  }

  const { connected, sites, selectedSiteUrl, summary } = state
  const maxClicks = summary?.topQueries.reduce((m, q) => Math.max(m, q.clicks), 0) ?? 0

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
            <BingIcon className="h-6 w-6" />
          </div>
          <div className="pt-0.5">
            <h3 className="font-[Signifier,_Georgia,_serif] text-base font-semibold leading-tight text-zinc-900">
              Bing Webmaster Tools
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {connected && selectedSiteUrl
                ? `Tracking ${selectedSiteUrl}`
                : 'Bing organic search impressions, clicks, and keyword rankings'}
            </p>
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-2">
            {summary && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-600"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <a
            href={`/api/integrations/bing/connect?returnTo=${encodeURIComponent(pathname)}`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Connect Microsoft
          </a>
        )}
      </div>

      {connected && (
        <div className="border-t border-zinc-100 px-6 pb-6 pt-5 space-y-5">

          {/* Site selector */}
          {sites.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                Webmaster Property
              </p>
              <div className="space-y-1">
                {sites.map(site => (
                  <button
                    type="button"
                    key={site.siteUrl}
                    onClick={() => !saving && handleSelectSite(site.siteUrl)}
                    disabled={saving}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                      selectedSiteUrl === site.siteUrl
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    )}
                  >
                    <span className="truncate text-left">{site.siteUrl}</span>
                    {site.verified && (
                      <span className={cn(
                        'ml-2 shrink-0 text-xs',
                        selectedSiteUrl === site.siteUrl ? 'opacity-60' : 'text-zinc-400'
                      )}>
                        verified
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sites.length === 0 && (
            <p className="text-sm text-zinc-400">
              No verified sites found. Add and verify your site in{' '}
              <a
                href="https://www.bing.com/webmasters"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-600"
              >
                Bing Webmaster Tools
              </a>
              {' '}then reconnect.
            </p>
          )}

          {/* Summary stats */}
          {summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Clicks"      value={fmt(summary.totalClicks)}                    icon={MousePointerClick} />
                <StatPill label="Impressions" value={fmt(summary.totalImpressions)}               icon={Eye} />
                <StatPill label="Avg CTR"     value={`${(summary.avgCtr * 100).toFixed(1)}%`}    icon={TrendingUp} />
              </div>

              {summary.topQueries.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="mb-2 flex w-full items-center justify-between"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                      Top Queries · last {summary.windowDays} days
                    </p>
                    {expanded
                      ? <ChevronUp className="h-3 w-3 text-zinc-400" />
                      : <ChevronDown className="h-3 w-3 text-zinc-400" />
                    }
                  </button>

                  <div className="space-y-1.5">
                    {(expanded ? summary.topQueries : summary.topQueries.slice(0, 4)).map(q => (
                      <div key={q.query} className="flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-[#0078D4]"
                            style={{ width: maxClicks > 0 ? `${(q.clicks / maxClicks) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="w-32 truncate text-right text-xs text-zinc-600" title={q.query}>
                          {q.query}
                        </span>
                        <span className="w-12 text-right text-xs tabular-nums text-zinc-400">
                          {fmt(q.clicks)}
                        </span>
                        <span className="w-14 text-right text-[10px] tabular-nums text-zinc-300">
                          #{q.position.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSiteUrl && !summary && (
            <p className="text-sm text-zinc-400">
              No search data yet. It may take 24–48 hours after connecting for data to appear.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/publishing/BingWebmasterCard.tsx
git commit -m "feat: BingWebmasterCard component"
```

---

## Task 10: Wire into the publishing settings page

Add `<BingWebmasterCard />` to the Search Performance section and handle the `connected=bing` / `error=bing_*` OAuth callback toast messages.

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`

- [ ] **Step 1: Add the import**

At the top of the file, alongside the GoogleSearchConsoleCard import, add:

```typescript
import { BingWebmasterCard } from '@/components/publishing/BingWebmasterCard'
```

- [ ] **Step 2: Add the `connected=bing` toast case**

In `PublishingInfrastructureContent`, find the `useEffect` that reads `searchParams` (around line 441) and adds toast messages. It currently handles `connected === 'google'`. Add a `bing` case immediately after:

Current code (around line 455):
```typescript
else if (connected === 'google') flash('Google Analytics & Search Console connected.', true)
```

Add after it:
```typescript
else if (connected === 'bing') flash('Bing Webmaster Tools connected.', true)
```

Also add error cases after the existing `error === 'token_exchange_failed'` block:
```typescript
else if (error === 'bing_denied') flash('Bing connection cancelled.', false)
else if (error === 'bing_token_exchange_failed') flash('Bing rejected the connection. Check your app credentials.', false)
else if (error === 'bing_server_error') flash('Bing connection failed — server error. Try again.', false)
```

- [ ] **Step 3: Add BingWebmasterCard to the Search Performance section**

Find the Search Performance section (around line 762–770):

```tsx
{/* Search Performance */}
<section className="mb-8">
  <div className="mb-4">
    <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">Search Performance</h2>
  </div>
  <Suspense>
    <GoogleSearchConsoleCard />
  </Suspense>
</section>
```

Change it to:

```tsx
{/* Search Performance */}
<section className="mb-8">
  <div className="mb-4">
    <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">Search Performance</h2>
  </div>
  <div className="space-y-4">
    <Suspense>
      <GoogleSearchConsoleCard />
    </Suspense>
    <Suspense>
      <BingWebmasterCard />
    </Suspense>
  </div>
</section>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify the card renders**

```bash
npm run dev
```

Navigate to `/settings/publishing`. Confirm:
- The Search Performance section shows two cards stacked vertically
- Google Search Console card is unchanged
- Bing Webmaster Tools card shows the "Connect Microsoft" button
- Card header, icon, and tagline render correctly
- No console errors

- [ ] **Step 6: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx"
git commit -m "feat: add BingWebmasterCard to Search Performance section"
```

---

## Task 11: Azure app registration (manual — one-time)

This is a manual step performed in the Azure portal. Record the values in your environment.

- [ ] **Step 1: Register the app**

1. Go to [portal.azure.com](https://portal.azure.com) → Microsoft Entra ID → App registrations → **New registration**
2. Name: `Clout Bing Webmaster`
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts (Multitenant + Personal)**
4. Redirect URI: **Web** → `https://your-production-domain.com/api/integrations/bing/callback`
   - Add a second for local dev: `http://localhost:3000/api/integrations/bing/callback`
5. Click **Register**

- [ ] **Step 2: Add API permission**

In the registered app → **API permissions** → **Add a permission** → **APIs my organization uses** → search **Bing Webmaster** → select `https://webmaster.api.bing.com/user_impersonation` (delegated) → **Add permissions**

If Bing Webmaster doesn't appear by name: use "Request API permissions" → enter the scope `https://webmaster.api.bing.com/.default` directly.

- [ ] **Step 3: Create a client secret**

**Certificates & secrets** → **New client secret** → description `clout-production` → **Add** → copy the **Value** immediately (only shown once).

- [ ] **Step 4: Copy credentials**

**Overview** → copy **Application (client) ID**

```
BING_CLIENT_ID=<Application (client) ID>
BING_CLIENT_SECRET=<secret value from step 3>
```

Set in:
- `.env.local` for local development
- Vercel dashboard (or `vercel env add BING_CLIENT_ID` / `vercel env add BING_CLIENT_SECRET`) for production

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: With dev env vars set, test the OAuth flow**

Start the dev server with real Bing credentials:
```bash
npm run dev
```

1. Navigate to `/settings/publishing`
2. Click **Connect Microsoft** on the Bing Webmaster Tools card
3. Complete Microsoft sign-in and authorize the app
4. Verify redirect back to `/settings/publishing?connected=bing`
5. Verify toast: "Bing Webmaster Tools connected."
6. Verify the card switches to connected state and shows the site picker

- [ ] **Step 2: Select a site and verify stats load**

1. Click a site in the Bing card's site picker
2. Wait for the card to reload
3. Verify clicks / impressions / avg CTR appear (or "No search data yet" if newly connected)

- [ ] **Step 3: Test disconnect**

1. Click **Disconnect** in the card header
2. Verify the card returns to the "Connect Microsoft" state
3. Verify no JS errors in console

- [ ] **Step 4: Commit any fixes, then tag the feature complete**

```bash
git add -A
git commit -m "fix: any issues found during smoke test"
```
