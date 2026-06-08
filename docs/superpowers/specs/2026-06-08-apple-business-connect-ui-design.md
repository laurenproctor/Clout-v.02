# Apple Business Connect UI Integration

**Date:** 2026-06-08
**Scope:** UI integration — connect/disconnect flow, location selection, and channel display in `/settings/publishing`. Includes one new API route (`connect-stored`) and one new migration (`apple_business_name` column).

---

## Context

The ABC backend is fully built:
- `lib/channels/apple-business-connect/` — OAuth2 token exchange auth, 3-level location hierarchy, API contract
- `app/api/channels/apple-business-connect/` — `connect`, `disconnect`, `pending-locations`, `select-locations` routes
- `apple_business_connect` enum value in `channel_platform`, `workspace_provider_credentials` table, and ABC-specific columns on `channels` (including `apple_company_id`, `apple_business_id`, `apple_location_id`, `apple_location_name`, `apple_address`)

What's missing is any frontend surface: no platform card, no connect modal, no location picker, no channel display.

ABC uses **API credentials** (Key ID, Issuer ID, EC private key), not OAuth. The connect flow is therefore form-based, not a redirect.

---

## Page Placement

ABC is added to the **"Local Distribution" section** in `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`, alongside Google Business Profile. The grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) already accommodates a second card without layout changes.

"Apple Business Connect" is removed from the `PLANNED` array at the bottom of the page.

---

## Connect Flow

The connect flow uses two separate modals. Which modal opens first depends on whether stored credentials exist.

### "Add Location" / initial connect — smart entry point

When the user clicks "Connect" (no channels yet) or "Add Location" (channels exist), the handler:

1. Calls `POST /api/channels/apple-business-connect/connect-stored` (new route — see below)
2. **If stored credentials exist and are valid:** sets the `abc_pending` cookie, fetches pending locations, opens the location picker directly (skip credential entry)
3. **If no stored credentials, or validation fails:** opens `ABCConnectModal` (credential entry)

This means users who already have credentials stored never have to re-enter them.

### New route: `POST /api/channels/apple-business-connect/connect-stored`

This route re-uses existing workspace credentials to re-populate the `abc_pending` cookie without requiring the user to re-enter credentials.

**Logic:**
1. Load and decrypt stored credential from `workspace_provider_credentials` for `provider = 'apple_business_connect'`
2. If none found: return `{ error: 'no_credentials' }` (404)
3. Call `listAllLocations(creds)` — if this throws: return `{ error: 'validation_failed' }` (422)
4. Set `abc_pending` cookie (same as `connect` route does)
5. Return `{ ok: true }`

The UI then calls `GET /api/channels/apple-business-connect/pending-locations` to get the location list (same as the fresh-credentials path).

### Modal 1 — Credential Entry (`ABCConnectModal`)

Only shown when no stored credentials exist, or when `connect-stored` returns an error.

**Layout:**
- Header: Apple logo (black rounded square, inline SVG) + "Connect Apple Business Connect" + close (×) button
- Subheading: "Find these in " + link "Apple Business Connect → API Keys" (opens Apple's key management page)
- Three fields:
  - **Key ID** — text input, monospace, right-side hint `e.g. ABC123XYZ`
  - **Issuer ID** — text input, monospace, right-side hint `UUID format`
  - **Private Key** — textarea (~4 rows), monospace, right-side hint `PEM — include BEGIN/END headers`
- Security callout (amber background): "Your private key is encrypted at rest and never exposed in the UI after saving."
- Inline error message below fields on validation failure
- Buttons: Cancel | **Validate & Connect** (loading state while request is in-flight)

**Behavior:**
1. User submits → `POST /api/channels/apple-business-connect/connect` with `{ keyId, issuerId, privateKey }`
2. On error (422/4xx): show inline error, keep modal open
3. On success: close modal, call `GET /api/channels/apple-business-connect/pending-locations`, set `abcLocations`, open Modal 2

### Modal 2 — Location Picker (`ABCLocationPicker`)

Triggered after either successful credential validation (fresh or stored).

**Layout:**
- Header: "Connect Apple Business Connect" + close button
- Search input — shown only when **> 8 locations** (not > 4)
- Scrollable checkbox list (`max-h-72`)
- Each row: checkbox + **location name** (bold) + city/state subtitle
- Footer: "N selected" count + **Connect Selected** button (disabled when 0 selected)
- **Empty state** (when 0 locations returned): centered message — "No locations found. Ensure your API key has access to at least one verified business location in Apple Business Connect." with a "Re-enter Credentials" link that opens `ABCConnectModal`

**Behavior:**
1. User selects locations → `POST /api/channels/apple-business-connect/select-locations` with `{ locationIds: [...] }`
2. On success: close picker, call `reloadChannels()`, flash toast
3. On error: flash error toast, keep picker open

### Duplicate location protection

Both the API and UI handle duplicates:

**`GET /api/channels/apple-business-connect/pending-locations`** — modified to filter out locations already connected in this workspace. It queries `channels` for `platform = 'apple_business_connect' AND is_active = true AND workspace_id = session.workspaceId` and excludes any `locationId` already present in `apple_location_id`.

**`POST /api/channels/apple-business-connect/select-locations`** — already calls `createOrUpdateChannelByAccountId` which upserts by `accountId` (= `locationId`), so it naturally handles duplicates server-side. No additional check needed there.

The UI location picker does not need its own deduplication logic since the API handles it before the list reaches the client.

### Cancellation after credential validation

If the user closes `ABCLocationPicker` without selecting any locations:
- The `abc_pending` cookie expires naturally (10-minute TTL)
- `workspace_provider_credentials` is **not written** until `select-locations` is called — so no credentials are stored and the state is clean
- "Add Location" will again attempt `connect-stored`, find no credentials, and fall back to credential entry

---

## Connected State

### Platform Card

```
[Apple logo]  Apple Business Connect
              Maps presence · business showcase

  [■] Starbucks Reserve · SF        ✕
      Starbucks Coffee Company · San Francisco · CA

  [■] Starbucks · Oakland           ✕
      Starbucks Coffee Company · Oakland · CA

  + Add Location
```

- Icon: Apple logo SVG on black rounded square (`bg-black text-white`)
- Name: `"Apple Business Connect"`
- Tagline: `"Maps presence · business showcase"`
- Each connected location row:
  - **Label** (primary): `channel.label` (= `apple_location_name`)
  - **Subtitle**: `[apple_business_name, city, stateOrProvince].filter(Boolean).join(' · ')` from `apple_address` JSONB and the new `apple_business_name` column
  - Disconnect ✕: calls `handleDisconnectChannel(id)` → `DELETE /api/channels/[id]`
- "Add Location" → triggers the smart entry point handler (stored-credentials first)
- `connectLabel`: `"Connect Location"`

### New migration required

`apple_business_name` is not in the existing migration. A second migration adds it:

```sql
-- supabase/migrations/20260608002_abc_business_name.sql
alter table channels
  add column if not exists apple_business_name text;
```

`app/api/channels/apple-business-connect/select-locations/route.ts` is updated to write `apple_business_name: matchedGroup.business.name` in the same `supabase.from('channels').update(...)` call.

### Note on `apple_company_id` / `apple_business_id`

These are **already stored** by the existing `select-locations` route (migration `20260608001` added the columns; the route writes them). No additional work needed.

### Channel data shape

The existing `Channel` interface in the publishing page gains two optional fields:

```ts
apple_business_name?: string | null
apple_address?: { city?: string; stateOrProvince?: string } | null
```

Note: `apple_address` uses `stateOrProvince` (not `state`) — matching `ABCLocation.address`.

---

## State Variables

Two new state variables in `PublishingInfrastructureContent`:

```ts
const [showABCModal,  setShowABCModal]  = useState(false)
const [abcLocations,  setAbcLocations]  = useState<PendingABCLocation[] | null>(null)
```

Where `PendingABCLocation` matches the `pending-locations` response shape:

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

---

## Toast Messages

| Condition | Message |
|---|---|
| 1 location connected | `'Apple Business Connect location connected.'` |
| 2+ locations connected | `'N Apple Business Connect locations connected.'` |

Credential validation errors are shown **inline in Modal 1**, not as toasts. Empty-state messaging is handled inside the location picker.

---

## Entitlement Gating

Connect actions (both "Connect" and "Add Location") are wrapped in `guardedOnConnect`, which shows `'Upgrade your plan to connect more accounts.'` if `canConnect === false`.

---

## Files Changed

| File | Change |
|---|---|
| `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx` | Add `ABCConnectModal`, `ABCLocationPicker`, `AppleIcon` components; add ABC platform card to Local Distribution section; wire state variables, handlers, and toast cases |
| `supabase/migrations/20260608002_abc_business_name.sql` | New file — adds `apple_business_name text` column to `channels` |
| `app/api/channels/apple-business-connect/connect-stored/route.ts` | New file — POST route that reuses stored credentials to re-populate `abc_pending` cookie |
| `app/api/channels/apple-business-connect/pending-locations/route.ts` | Modified — filter out already-connected locations for this workspace |
| `app/api/channels/apple-business-connect/select-locations/route.ts` | Modified — write `apple_business_name` field |
