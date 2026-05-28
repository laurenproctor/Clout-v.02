# GA4 + Search Console Inline Card on Publishing Page

**Date:** 2026-05-28  
**Status:** Approved

## Summary

Replace the "Editorial Intelligence" link-banner on `/settings/publishing` with a full inline GA4 + Search Console connection card that mirrors the functionality currently living on `/settings/analytics`. Achieved by extracting a shared `EditorialIntelligenceCard` component used in both locations.

## Component Structure

**New file:** `components/analytics/EditorialIntelligenceCard.tsx`

- Fully self-contained — no props, manages its own state and data fetching
- State: `{ connected, properties, sites, selectedPropertyId, selectedSiteUrl }` + `loading` + `toast`
- On mount: fetches `/api/integrations/google/properties` and `/api/integrations/google/sites` in parallel
- Disconnected state: Google icon + "Editorial Intelligence" heading + tagline + "Connect Google" link to `/api/integrations/google/connect`
- Connected state: GA4 property picker + Search Console site picker + "Disconnect" button
- Reads `?connected=google` and `?error=...` search params to show OAuth callback toasts, then clears them via `router.replace`
- Loading: simple pulse skeleton (two lines)
- No entitlement gate (GA4 is a measurement tool, not a publishing channel)

## Visual Treatment

Card shell: `rounded-2xl border border-zinc-200 bg-white p-6` — matches other cards on the publishing page.

Icon container: `h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100` — same as PlatformCard.

Section label above card on the publishing page: `text-[11px] font-medium uppercase tracking-widest text-zinc-400` reading "Analytics" — consistent with "Distribution Channels", "Local Distribution", "Owned Publishing".

Property/site picker buttons: `bg-zinc-900 text-white` for the selected item, `bg-zinc-50 hover:bg-zinc-100 text-zinc-700` for others — same as the analytics page today.

## Changes by File

### `components/analytics/EditorialIntelligenceCard.tsx` (new)
All connection state, fetch handlers, property/site pickers, and OAuth callback detection extracted here.

### `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`
- Remove the "Editorial Intelligence" link-banner (lines 751–762)
- Add an "Analytics" section label in the same position
- Render `<EditorialIntelligenceCard />`

### `app/[workspaceSlug]/(dashboard)/settings/analytics/page.tsx`
- Remove all inline connection state/handlers/UI
- Keep the page heading block (`h1` + description paragraph)
- Render `<EditorialIntelligenceCard />`
- Remove the `confirm()` disconnect dialog — the component uses toast-based feedback only

## Data Flow

1. Component mounts → parallel fetch of properties and sites endpoints
2. If either returns `connected: true`, `state.connected` is `true`
3. "Connect Google" → navigates to `/api/integrations/google/connect` (existing OAuth entry point)
4. OAuth completes → user lands back on whichever page initiated the flow with `?connected=google` or `?error=...`
5. Component reads these params, shows toast, calls `router.replace` to strip params from URL
6. Property/site selection → POST to respective select endpoints, updates local state on success
7. Disconnect → POST to `/api/integrations/google/disconnect`, resets state to disconnected

## Out of Scope

- No changes to API routes
- No changes to the OAuth flow itself
- Search Console stays grouped with GA4 (same Google OAuth scope, same connect button)
