# Apple Business Connect UI Integration

**Date:** 2026-06-08
**Scope:** UI integration only — connect/disconnect flow, location selection, and channel display in `/settings/publishing`. Backend API routes and library are already complete.

---

## Context

The ABC backend is fully built:
- `lib/channels/apple-business-connect/` — OAuth2 token exchange auth, 3-level location hierarchy, API contract
- `app/api/channels/apple-business-connect/` — `connect`, `disconnect`, `pending-locations`, `select-locations` routes
- `apple_business_connect` enum value in `channel_platform`, `workspace_provider_credentials` table, and ABC-specific columns on `channels`

What's missing is any frontend surface: no platform card, no connect modal, no location picker, no channel display.

ABC uses **API credentials** (Key ID, Issuer ID, EC private key), not OAuth. The connect flow is therefore form-based, not a redirect.

---

## Page Placement

ABC is added to the **"Local Distribution" section** in `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`, alongside Google Business Profile. The grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) already accommodates a second card without layout changes.

"Apple Business Connect" is removed from the `PLANNED` array at the bottom of the page.

---

## Connect Flow

The connect flow uses two separate modals, consistent with how GBP handles its post-OAuth location step.

### Modal 1 — Credential Entry (`ABCConnectModal`)

Triggered by clicking "Connect" on the ABC platform card.

**Layout:**
- Header: Apple logo (black rounded square, inline SVG) + "Connect Apple Business Connect" + close (×) button
- Subheading: `"Find these in "` + link `"Apple Business Connect → API Keys"` (opens Apple's API key management page)
- Three fields:
  - **Key ID** — text input, monospace, right-side hint `e.g. ABC123XYZ`
  - **Issuer ID** — text input, monospace, right-side hint `UUID format`
  - **Private Key** — textarea (~4 rows), monospace, right-side hint `PEM — include BEGIN/END headers`
- Security callout (amber background): `"Your private key is encrypted at rest and never exposed in the UI after saving."`
- Inline error message below fields on validation failure (e.g. "Invalid credentials or API error. Verify your Key ID, Issuer ID, and private key.")
- Buttons: Cancel | **Validate & Connect** (loading state while request is in-flight)

**Behavior:**
1. User submits → `POST /api/channels/apple-business-connect/connect` with `{ keyId, issuerId, privateKey }`
2. On error (422/4xx): show inline error, keep modal open
3. On success: close modal, immediately call `GET /api/channels/apple-business-connect/pending-locations`, set `abcLocations` state, opens Modal 2

### Modal 2 — Location Picker (`ABCLocationPicker`)

Triggered automatically after successful credential validation.

**Layout:** Follows `GBPLocationPicker` exactly:
- Header: "Connect Apple Business Connect" + close button
- Search input (shown only when > 4 locations)
- Scrollable checkbox list (max-height 288px / `max-h-72`)
- Each row: checkbox + **location name** (bold) + city/state subtitle
- Footer: "N selected" count + **Connect Selected** button (disabled when 0 selected)

**Behavior:**
1. User selects locations → `POST /api/channels/apple-business-connect/select-locations` with `{ locationIds: [...] }`
2. On success: close picker, call `reloadChannels()`, flash toast
3. On error: flash error toast, keep picker open

---

## Connected State

### Platform Card

```
[Apple logo]  Apple Business Connect
              Maps presence · business showcase

  [■] Starbucks Reserve · SF        ✕
      Starbucks Coffee Company · San Francisco, CA

  [■] Starbucks · Oakland           ✕
      Starbucks Coffee Company · Oakland, CA

  + Add Location
```

- Icon: Apple logo SVG on black rounded square background (`bg-black`, `text-white`)
- Name: `"Apple Business Connect"`
- Tagline: `"Maps presence · business showcase"`
- Each connected location row:
  - **Label** (primary): `channel.label` (the location name, stored as `apple_location_name`)
  - **Subtitle**: `channel.apple_business_name ?? '' + city + state` — shows the business (brand) name + city/state, drawn from `apple_address` JSONB and the `label` field
  - Disconnect ✕ button: calls `handleDisconnectChannel(id)` → `DELETE /api/channels/[id]`
- "Add Location" → triggers `ABCConnectModal` again (user enters credentials, picks additional locations)
- `connectLabel`: `"Connect Location"`

### New migration required

The chosen connected-card design (Option B) shows the business name in the subtitle, but `apple_business_name` is not currently stored on `channels`. A new migration is needed:

```sql
-- supabase/migrations/20260608002_abc_business_name.sql
alter table channels
  add column if not exists apple_business_name text;
```

`app/api/channels/apple-business-connect/select-locations/route.ts` must be updated to write `apple_business_name: matchedGroup.business.name` alongside the other ABC columns.

### Channel data shape

The existing `Channel` interface in the page needs three new optional fields:
```ts
apple_business_name?: string | null
apple_address?: { city?: string; stateOrProvince?: string } | null
```

Note: `apple_address` uses `stateOrProvince`, not `state` — matching the `ABCLocation.address` type.

The label stored in `channels.label` is the location name. The subtitle is constructed as:
```ts
[channel.apple_business_name, channel.apple_address?.city, channel.apple_address?.stateOrProvince]
  .filter(Boolean).join(' · ')
```

---

## State Variables

Two new state variables added to `PublishingInfrastructureContent`:

```ts
const [showABCModal,  setShowABCModal]  = useState(false)
const [abcLocations,  setAbcLocations]  = useState<PendingABCLocation[] | null>(null)
```

Where `PendingABCLocation` matches the `GET /api/channels/apple-business-connect/pending-locations` response shape (already typed as `PendingLocation` in the route file):

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

Added to the `useEffect` that handles `searchParams`:

| Condition | Message |
|---|---|
| `connected === 'apple_business_connect'` | `'Apple Business Connect location connected.'` (1) or `'N Apple Business Connect locations connected.'` (2+) |

Error cases (inline in Modal 1, not toast-based):
- Credential validation failure — shown inline
- No locations found — shown inline

---

## Entitlement Gating

Connect actions are gated the same way as all other channels: `guardedOnConnect` wraps the `setShowABCModal(true)` call, and shows `'Upgrade your plan to connect more accounts.'` if `canConnect === false`.

---

## Files Changed

1. `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx` — only file modified. All new components (`ABCConnectModal`, `ABCLocationPicker`, `AppleIcon`) are defined inline in this file, following the existing pattern (all channel-specific modals live in this file).
