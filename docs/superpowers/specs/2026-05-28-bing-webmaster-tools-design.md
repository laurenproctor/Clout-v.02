# Bing Webmaster Tools — Search Performance Integration

**Date:** 2026-05-28  
**Status:** Approved

## Summary

Add a `BingWebmasterCard` to the Search Performance section of `/settings/publishing`, directly below the existing `GoogleSearchConsoleCard`. Authenticated via Microsoft Entra ID (Azure AD) OAuth 2.0 — completely independent from the Google credential. Stores tokens in the existing `analytics_connections` table under provider `'bing_wmt'`. Displays the same metrics shape as GSC: clicks, impressions, avg CTR, top queries.

## Architecture

### Database migration
Alter the two existing check constraints to accept Bing values:
- `analytics_connections.provider`: extend to include `'bing_wmt'`
- `analytics_properties.property_type`: extend to include `'bing_wmt_site'`

Drop and recreate the constraints (Postgres does not support `ALTER CONSTRAINT`).

### `lib/analytics/bing/client.ts`
- Exports `bingGet(workspaceId, path)` — fetches from `https://ssl.bing.com/webmaster/api.svc/json/{path}?siteUrl=...` with Bearer token
- Handles token refresh against Microsoft token endpoint (`https://login.microsoftonline.com/common/oauth2/v2.0/token`) independently from the Google refresh path in `connections.ts`
- Uses existing `getAnalyticsConnection` / `createServiceClient` for storage; updates the row directly on refresh

### `lib/analytics/bing/queries.ts`
- `listBingSites(workspaceId)` → calls `GetUserSites`, returns `{ siteUrl: string; verified: boolean }[]`
- `fetchBingKeywords(workspaceId, siteUrl, startDate, endDate)` → calls `GetKeywordStats`, returns `{ query, clicks, impressions, position }[]` normalized to the same shape as `GSCRow`

### API routes — all under `app/api/integrations/bing/`

| Route | Method | Purpose |
|---|---|---|
| `connect/route.ts` | GET | Redirect to Microsoft OAuth; stores `state` + `returnTo` in session cookie |
| `callback/route.ts` | GET | Exchange code for tokens; encrypt + upsert via `upsertAnalyticsConnection`; redirect with `?connected=bing` |
| `search/route.ts` | GET | Returns `{ connected, sites, selectedSiteUrl, summary }` |
| `select-site/route.ts` | POST | Saves selected site via `upsertAnalyticsProperty` |
| `disconnect/route.ts` | POST | Calls `deleteAnalyticsConnection` + deletes the `bing_wmt_site` property row |

### `components/publishing/BingWebmasterCard.tsx`
Self-contained client component. Structure mirrors `GoogleSearchConsoleCard` exactly:
- Loading: pulse skeleton
- Disconnected: icon + title + "Connect Microsoft" button → `/api/integrations/bing/connect?returnTo=<pathname>`
- Connected, no site selected: site list picker (radio-style buttons)
- Connected, site selected: `StatPill` grid (Clicks / Impressions / Avg CTR) + collapsible Top Queries bar chart
- Icon color: `#0078D4` (Microsoft blue)
- "Reconnect" link when already connected

### `publishing/page.tsx`
Import `BingWebmasterCard` and render it inside the existing Search Performance `<section>`, stacked vertically below `<GoogleSearchConsoleCard />`. No grid — both cards are full-width in that section.

## Environment Variables

```env
BING_CLIENT_ID=      # Microsoft Entra app (application) ID
BING_CLIENT_SECRET=  # Client secret value from Azure portal
```

Redirect URI to register in Azure: `https://<your-domain>/api/integrations/bing/callback`

## Microsoft Azure Setup (one-time, manual)

1. portal.azure.com → Microsoft Entra ID → App registrations → New registration
2. Name: "Clout Bing Webmaster"
3. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
4. Redirect URI: Web → `https://<domain>/api/integrations/bing/callback`
5. API permissions → Add → "Bing Webmaster" → `https://webmaster.api.bing.com/.default` (delegated)
6. Certificates & secrets → New client secret → copy value → `BING_CLIENT_SECRET`
7. Overview → copy Application (client) ID → `BING_CLIENT_ID`

## Data Flow

1. User clicks "Connect Microsoft" → GET `/api/integrations/bing/connect` → redirect to Microsoft OAuth
2. User authorizes → Microsoft redirects to `/api/integrations/bing/callback?code=...&state=...`
3. Callback: exchange code → encrypt tokens → `upsertAnalyticsConnection(workspaceId, 'bing_wmt', ...)`
4. Redirect back to `/settings/publishing?connected=bing`
5. Card mounts → GET `/api/integrations/bing/search` → shows site picker
6. User selects site → POST `/api/integrations/bing/select-site` → card reloads with stats

## Out of Scope

- No changes to the Google OAuth flow
- No changes to existing GSC or GA4 routes
- No Bing data in the editorial intelligence / feed analytics views (Bing WMT is search-only, surfaced in the Search Performance section only)
