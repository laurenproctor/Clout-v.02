# Apple Business Connect UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full UI integration for Apple Business Connect to `/settings/publishing` — credential entry modal, location picker, platform card, and a `connect-stored` route that reuses existing credentials for "Add Location."

**Architecture:** All UI lives in the existing `settings/publishing/page.tsx` as inline components (following the pattern of every other channel modal). Two new inline components (`ABCConnectModal`, `ABCLocationPicker`) are added alongside a new `AppleIcon` SVG. Backend changes are: one migration (`apple_business_name` column), one new route (`connect-stored`), and small modifications to two existing routes (`pending-locations` adds dedup filtering; `select-locations` writes the new field). `PlatformCard` gains an optional `subtitle` field on `ConnectedAccount` to support the business name line.

**Tech Stack:** Next.js App Router, Supabase (service client), TypeScript, Tailwind CSS v4, `signCookiePayload` / `verifyCookiePayload` from `@/lib/signed-cookie`, `getProviderCredential` from `@/lib/domain/provider-credentials`, `listAllLocations` from `@/lib/channels/apple-business-connect/locations`

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/20260608002_abc_business_name.sql` | Create |
| `types/db.ts` | Modify — add `apple_business_name` to channels Row/Insert/Update |
| `app/api/channels/apple-business-connect/connect-stored/route.ts` | Create |
| `app/api/channels/apple-business-connect/pending-locations/route.ts` | Modify — filter connected locations |
| `app/api/channels/apple-business-connect/select-locations/route.ts` | Modify — write `apple_business_name` |
| `components/publishing/PlatformCard.tsx` | Modify — add `subtitle?` to `ConnectedAccount` |
| `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx` | Modify — add all ABC UI |

---

## Task 1: Migration — add `apple_business_name` to channels

**Files:**
- Create: `supabase/migrations/20260608002_abc_business_name.sql`
- Modify: `types/db.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260608002_abc_business_name.sql
alter table channels
  add column if not exists apple_business_name text;
```

- [ ] **Step 2: Apply the migration**

Open the Supabase dashboard → SQL editor, paste and run the migration. Alternatively: `npx supabase db push` if Supabase CLI is configured.

- [ ] **Step 3: Update `types/db.ts` — channels Row type**

Find the `channels` Row type (search for `apple_location_name: string | null`) and add the new field directly after `apple_location_name`:

```ts
          apple_business_name: string | null
          apple_location_name: string | null
```

- [ ] **Step 4: Update `types/db.ts` — channels Insert type**

Find the channels Insert type (search for `apple_location_name?: string | null` in the Insert block, around line 895) and add:

```ts
          apple_business_name?: string | null
          apple_location_name?: string | null
```

- [ ] **Step 5: Update `types/db.ts` — channels Update type**

Find the channels Update type (same field in the Update block, around line 919) and add:

```ts
          apple_business_name?: string | null
          apple_location_name?: string | null
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors related to `apple_business_name`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260608002_abc_business_name.sql types/db.ts
git commit -m "feat: add apple_business_name column to channels"
```

---

## Task 2: Update `select-locations` — write `apple_business_name`

**Files:**
- Modify: `app/api/channels/apple-business-connect/select-locations/route.ts:57-67`

- [ ] **Step 1: Add `apple_business_name` to the update call**

In `select-locations/route.ts`, find the `supabase.from('channels').update({...})` block and add the new field:

```ts
    await supabase
      .from('channels')
      .update({
        provider_credential_id: providerCredId,
        apple_company_id:       matchedGroup.company.id,
        apple_business_id:      matchedGroup.business.id,
        apple_business_name:    matchedGroup.business.name,
        apple_location_id:      matchedLoc.id,
        apple_location_name:    matchedLoc.name,
        apple_address:          (matchedLoc.address ?? null) as Json | null,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', channelId)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `select-locations/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/channels/apple-business-connect/select-locations/route.ts
git commit -m "feat: persist apple_business_name in select-locations route"
```

---

## Task 3: Update `pending-locations` — filter already-connected locations

**Files:**
- Modify: `app/api/channels/apple-business-connect/pending-locations/route.ts`

The current route maps all locations from the signed cookie. This task makes it skip locations already connected to the workspace (i.e. active channels where `apple_location_id` matches).

- [ ] **Step 1: Replace the file contents**

```ts
// app/api/channels/apple-business-connect/pending-locations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import { createServiceClient } from '@/lib/supabase/service'
import type { ABCPendingPayload } from '../connect/route'

export interface PendingLocation {
  locationId:  string
  businessId:  string
  companyId:   string
  name:        string
  city:        string | null
  state:       string | null
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('abc_pending')?.value
  if (!token) return NextResponse.json({ error: 'no_pending_locations' }, { status: 404 })

  let payload: ABCPendingPayload
  try {
    payload = verifyCookiePayload<ABCPendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  // Filter out locations that are already connected in this workspace
  const supabase = createServiceClient()
  const { data: connected } = await supabase
    .from('channels')
    .select('apple_location_id')
    .eq('workspace_id', payload.workspaceId)
    .eq('platform', 'apple_business_connect')
    .eq('is_active', true)

  const connectedIds = new Set(
    (connected ?? []).map(r => r.apple_location_id).filter(Boolean)
  )

  const locations: PendingLocation[] = payload.locationGroups
    .flatMap(({ company, business, locations }) =>
      locations.map(loc => ({
        locationId: loc.id,
        businessId: business.id,
        companyId:  company.id,
        name:       loc.name,
        city:       loc.address?.city ?? null,
        state:      loc.address?.stateOrProvince ?? null,
      }))
    )
    .filter(loc => !connectedIds.has(loc.locationId))

  return NextResponse.json({ locations })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `pending-locations/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/channels/apple-business-connect/pending-locations/route.ts
git commit -m "feat: filter already-connected locations from pending-locations route"
```

---

## Task 4: Create `connect-stored` route

**Files:**
- Create: `app/api/channels/apple-business-connect/connect-stored/route.ts`

This route re-uses stored credentials from `workspace_provider_credentials` to re-populate the `abc_pending` cookie — allowing "Add Location" to skip the credential entry modal when credentials are already on file.

- [ ] **Step 1: Create the directory and route file**

```ts
// app/api/channels/apple-business-connect/connect-stored/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getProviderCredential } from '@/lib/domain/provider-credentials'
import { signCookiePayload } from '@/lib/signed-cookie'
import { listAllLocations } from '@/lib/channels/apple-business-connect/locations'
import type { ABCCredentials } from '@/lib/channels/apple-business-connect/types'
import type { ABCPendingPayload } from '../connect/route'

export async function POST(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await getProviderCredential<ABCCredentials>(
    session.workspaceId,
    'apple_business_connect',
  )
  if (!record) {
    return NextResponse.json({ error: 'no_credentials' }, { status: 404 })
  }

  const creds = record.data

  let locationGroups
  try {
    locationGroups = await listAllLocations(creds)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[abc/connect-stored] stored credential validation failed:', msg)
    return NextResponse.json({ error: 'validation_failed' }, { status: 422 })
  }

  const cookieValue = signCookiePayload<ABCPendingPayload>({
    workspaceId: session.workspaceId,
    credentials: creds,
    locationGroups,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('abc_pending', cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  })
  return res
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in the new route file.

- [ ] **Step 3: Commit**

```bash
git add app/api/channels/apple-business-connect/connect-stored/route.ts
git commit -m "feat: add connect-stored route for credential reuse on Add Location"
```

---

## Task 5: Extend `PlatformCard` with optional `subtitle`

**Files:**
- Modify: `components/publishing/PlatformCard.tsx:73-82` (ConnectedAccount interface) and `components/publishing/PlatformCard.tsx:185-198` (account row render)

The current card renders `accountType` as a simple capitalized type label. Adding `subtitle` lets callers pass a free-text second line (used by ABC for business name + city/state) without affecting any existing callers.

- [ ] **Step 1: Add `subtitle` to `ConnectedAccount` interface**

Find the `ConnectedAccount` interface (around line 73) and add `subtitle` after `accountType`:

```ts
export interface ConnectedAccount {
  id: string
  label: string
  accountType?: string
  subtitle?: string
  tokenExpiresAt?: number | null
  reconnectHref?: string
  consecutiveFailures?: number
  lastPublishedAt?: string | null
  profileImageUrl?: string | null
}
```

- [ ] **Step 2: Update the account row render to use `subtitle` when present**

Find the block that renders `account.accountType` (around line 189) and replace it:

```tsx
                    {account.subtitle ? (
                      <p className="text-xs text-zinc-400">{account.subtitle}</p>
                    ) : (account.accountType && account.accountType !== 'personal') ? (
                      <p className="text-xs capitalize text-zinc-400">{account.accountType}</p>
                    ) : null}
```

- [ ] **Step 3: Verify TypeScript compiles and existing callers are unaffected**

```bash
npx tsc --noEmit
```

Expected: no errors. All existing callers that omit `subtitle` are unchanged.

- [ ] **Step 4: Commit**

```bash
git add components/publishing/PlatformCard.tsx
git commit -m "feat: add optional subtitle field to PlatformCard ConnectedAccount"
```

---

## Task 6: Add `AppleIcon`, types, state, and `ABCConnectModal` to publishing page

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`

- [ ] **Step 1: Add the `AppleIcon` SVG component**

Add this after the `BlueSkyIcon` function (around line 108), before the `// ─── Types ───` comment:

```tsx
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 814 1000" fill="currentColor" className={className}>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-166.8-105.4C71.5 813.5 12.2 690.2 12.2 573.4c0-214 139.8-327.6 277.9-327.6 71 0 130.2 46.5 173.9 46.5 41.9 0 107.9-49.4 188.3-49.4 30.2 0 108.2 2.6 168.1 80.6zm-119-189.4c29.7-35.1 51.1-83.8 51.1-132.5 0-6.5-.6-13-.6-19.1-48.8 1.9-106.8 32.5-142.1 72.5-26.5 29.9-51.9 78.6-51.9 128.1 0 7.1 1.3 14.3 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 43.9 0 97.2-29.3 128-66.8z" />
    </svg>
  )
}
```

- [ ] **Step 2: Extend the `Channel` interface**

Find the `Channel` interface (around line 114) and add two fields after `google_verified`:

```ts
interface Channel {
  id: string
  platform: string
  label: string | null
  account_type: string
  is_active: boolean
  token_expires_at: number | null
  profile_image_url?: string | null
  google_location_name?: string | null
  google_location_address?: { locality?: string; administrativeArea?: string } | null
  google_verified?: boolean | null
  apple_business_name?: string | null
  apple_address?: { city?: string; stateOrProvince?: string } | null
}
```

- [ ] **Step 3: Add the `PendingABCLocation` interface**

Add after the `PendingGBPLocation` interface (around line 138):

```ts
interface PendingABCLocation {
  locationId: string
  businessId: string
  companyId:  string
  name:       string
  city:       string | null
  state:      string | null
}
```

- [ ] **Step 4: Add state variables**

In `PublishingInfrastructureContent`, add two new state variables after the `gbpLocations` state (around line 485):

```ts
  const [abcLocations,  setAbcLocations]  = useState<PendingABCLocation[] | null>(null)
  const [showABCModal,  setShowABCModal]  = useState(false)
```

- [ ] **Step 5: Add the `ABCConnectModal` component**

Add after the `GBPLocationPicker` component and before `// ─── Main page ───`:

```tsx
function ABCConnectModal({
  onClose,
  onSuccess,
}: {
  onClose:   () => void
  onSuccess: (locations: PendingABCLocation[]) => void
}) {
  const [keyId,      setKeyId]      = useState('')
  const [issuerId,   setIssuerId]   = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!keyId.trim() || !issuerId.trim() || !privateKey.trim()) {
      setError('All three fields are required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/channels/apple-business-connect/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          keyId:      keyId.trim(),
          issuerId:   issuerId.trim(),
          privateKey: privateKey.trim(),
        }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Invalid credentials or API error. Verify your Key ID, Issuer ID, and private key.')
        return
      }
      const locRes  = await fetch('/api/channels/apple-business-connect/pending-locations')
      const locData = await locRes.json().catch(() => ({})) as { locations?: PendingABCLocation[] }
      onSuccess(locData.locations ?? [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <AppleIcon className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">Connect Apple Business Connect</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-400">
          Find these in{' '}
          <a
            href="https://businessconnect.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Apple Business Connect → API Keys
          </a>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Key ID</label>
              <span className="text-[10px] text-zinc-400">e.g. ABC123XYZ</span>
            </div>
            <input
              type="text"
              value={keyId}
              onChange={e => { setKeyId(e.target.value); setError('') }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400"
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Issuer ID</label>
              <span className="text-[10px] text-zinc-400">UUID format</span>
            </div>
            <input
              type="text"
              value={issuerId}
              onChange={e => { setIssuerId(e.target.value); setError('') }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Private Key</label>
              <span className="text-[10px] text-zinc-400">PEM — include BEGIN/END headers</span>
            </div>
            <textarea
              value={privateKey}
              onChange={e => { setPrivateKey(e.target.value); setError('') }}
              rows={4}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
            />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Your private key is encrypted at rest and never exposed in the UI after saving.
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? 'Validating…' : 'Validate & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx"
git commit -m "feat: add AppleIcon, types, state, and ABCConnectModal to publishing page"
```

---

## Task 7: Add `ABCLocationPicker` to publishing page

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`

Add this component directly after `ABCConnectModal` and before `// ─── Main page ───`:

- [ ] **Step 1: Add `ABCLocationPicker`**

```tsx
function ABCLocationPicker({
  locations,
  onConnect,
  onClose,
  onReenterCredentials,
}: {
  locations:            PendingABCLocation[]
  onConnect:            (locationIds: string[]) => Promise<void>
  onClose:              () => void
  onReenterCredentials: () => void
}) {
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState(false)

  const sorted   = [...locations].sort((a, b) => a.name.localeCompare(b.name))
  const q        = search.toLowerCase()
  const filtered = sorted.filter(loc =>
    !q ||
    loc.name.toLowerCase().includes(q) ||
    loc.city?.toLowerCase().includes(q) ||
    loc.state?.toLowerCase().includes(q)
  )

  function toggle(locationId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(locationId)) next.delete(locationId)
      else next.add(locationId)
      return next
    })
  }

  async function handleConnect() {
    if (selected.size === 0 || connecting) return
    setConnecting(true)
    await onConnect([...selected])
    setConnecting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Connect Apple Business Connect</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-500">No locations found.</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Ensure your API key has access to at least one verified business location in Apple Business Connect.
            </p>
            <button
              onClick={onReenterCredentials}
              className="mt-3 text-xs text-blue-500 hover:underline"
            >
              Re-enter Credentials
            </button>
          </div>
        ) : (
          <>
            {locations.length > 8 && (
              <input
                type="text"
                placeholder="Search locations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            )}

            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {filtered.map(loc => (
                <label
                  key={loc.locationId}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-zinc-200"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(loc.locationId)}
                    onChange={() => toggle(loc.locationId)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{loc.name}</p>
                    {(loc.city || loc.state) && (
                      <p className="text-xs text-zinc-400">
                        {[loc.city, loc.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-400">No locations match your search.</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
              <span className="text-xs text-zinc-400">
                {selected.size > 0 ? `${selected.size} selected` : 'Select locations to connect'}
              </span>
              <button
                onClick={handleConnect}
                disabled={selected.size === 0 || connecting}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  selected.size > 0 && !connecting
                    ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                    : 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                )}
              >
                {connecting ? 'Connecting…' : 'Connect Selected'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx"
git commit -m "feat: add ABCLocationPicker component to publishing page"
```

---

## Task 8: Wire handlers, platform card, toasts, and modal renders

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`

- [ ] **Step 1: Add the `handleConnectABC` handler (smart entry point)**

Add after `handleSelectGBPLocations` (around line 667):

```ts
  async function handleConnectABC() {
    const storedRes = await fetch('/api/channels/apple-business-connect/connect-stored', { method: 'POST' })
    if (storedRes.ok) {
      const locRes  = await fetch('/api/channels/apple-business-connect/pending-locations')
      const locData = await locRes.json().catch(() => ({})) as { locations?: PendingABCLocation[] }
      setAbcLocations(locData.locations ?? [])
    } else {
      setShowABCModal(true)
    }
  }
```

- [ ] **Step 2: Add the `handleSelectABCLocations` handler**

Add immediately after `handleConnectABC`:

```ts
  async function handleSelectABCLocations(locationIds: string[]) {
    const res = await fetch('/api/channels/apple-business-connect/select-locations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ locationIds }),
    })
    if (res.ok) {
      setAbcLocations(null)
      await reloadChannels()
      flash(
        locationIds.length === 1
          ? 'Apple Business Connect location connected.'
          : `${locationIds.length} Apple Business Connect locations connected.`,
        true,
      )
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      flash(data.error ?? 'Failed to connect locations.', false)
    }
  }
```

- [ ] **Step 3: Add `abcChannels` derived variable**

Find where `gbpChannels` is derived (around line 685):

```ts
  const gbpChannels = socialChannels.filter(c => c.platform === 'google_business_profile' && c.is_active)
```

Add immediately after:

```ts
  const abcChannels = socialChannels.filter(c => c.platform === 'apple_business_connect' && c.is_active)
```

- [ ] **Step 4: Add modal renders**

In the modals section (after the `{gbpLocations && ...}` block, around line 798), add:

```tsx
      {showABCModal && !connectBlocked && (
        <ABCConnectModal
          onClose={() => setShowABCModal(false)}
          onSuccess={locations => {
            setShowABCModal(false)
            setAbcLocations(locations)
          }}
        />
      )}
      {abcLocations !== null && (
        <ABCLocationPicker
          locations={abcLocations}
          onConnect={handleSelectABCLocations}
          onClose={() => setAbcLocations(null)}
          onReenterCredentials={() => {
            setAbcLocations(null)
            setShowABCModal(true)
          }}
        />
      )}
```

- [ ] **Step 5: Add ABC platform card to Local Distribution section**

Find the Local Distribution section (around line 920). After the GBP `PlatformCard`, add a second card:

```tsx
          <PlatformCard
            name="Apple Business Connect"
            tagline="Maps presence · business showcase"
            iconColorClass=""
            icon={
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-black">
                <AppleIcon className="h-[18px] w-[18px] text-white" />
              </div>
            }
            connected={abcChannels.map(c => ({
              id:       c.id,
              label:    c.label ?? 'Connected location',
              subtitle: [
                c.apple_business_name,
                c.apple_address?.city,
                c.apple_address?.stateOrProvince,
              ].filter(Boolean).join(' · ') || undefined,
            }))}
            onConnect={guardedOnConnect(handleConnectABC)}
            connectLabel="Connect Location"
            onDisconnect={handleDisconnectChannel}
            onAddAnother={guardedOnConnect(handleConnectABC)}
            addAnotherLabel="Add another location"
          />
```

- [ ] **Step 6: Remove "Apple Business Connect" from PLANNED**

Find the `PLANNED` array (around line 208):

```ts
const PLANNED = ['YouTube', 'Reddit', 'Mastodon', 'Ghost', 'Substack', 'Beehiiv', 'Webflow', 'Squarespace', 'Wix', 'HubSpot', 'Apple Business Connect', 'Nextdoor', 'Patch'] as const
```

Remove `'Apple Business Connect'` from it:

```ts
const PLANNED = ['YouTube', 'Reddit', 'Mastodon', 'Ghost', 'Substack', 'Beehiiv', 'Webflow', 'Squarespace', 'Wix', 'HubSpot', 'Nextdoor', 'Patch'] as const
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Verify the page renders — start dev server and inspect**

```bash
npm run dev
```

Navigate to `/[your-workspace]/settings/publishing`. Verify:

1. **Local Distribution section** shows two cards: Google Business Profile and Apple Business Connect
2. **ABC card (no channels connected):** shows black Apple logo icon, "Apple Business Connect" title, "Maps presence · business showcase" tagline, and a "Connect Location" button
3. **ABC card (channels connected):** shows location name as label, business name · city · state as subtitle, and Unlink button per location
4. **"Apple Business Connect" no longer appears** in the Planned Integrations strip at the bottom
5. **Connect Location button** opens `ABCConnectModal` (when no stored credentials) showing all three credential fields, format hints, security callout, and the Apple Business Connect → API Keys link
6. **After credential validation** the location picker opens and shows available locations with checkboxes; selecting and clicking "Connect Selected" creates channels and shows the toast

- [ ] **Step 9: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx"
git commit -m "feat: wire Apple Business Connect platform card, handlers, and modals"
```
