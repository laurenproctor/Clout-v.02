# Publishing Identity Context — Design Spec
**Date:** 2026-05-24  
**Status:** Approved  
**Build order:** Phase 3 — depends on Multi-Workspace Core (Spec 1)

---

## Overview

Makes workspace and account identity visible at every content creation surface. A persistent `IdentityBar` component renders at the top of the studio, syndicate, and LinkedIn create pages, showing: which workspace is active (with a switcher) and which publishing accounts will receive the post (with toggles). Prevents publishing to the wrong account or generating with the wrong brand voice.

---

## The Problem

With multiple workspaces, a user can easily lose track of context:
- Generating Amlon Group content while the Lauren Proctor workspace is active
- Publishing from the personal account when the corporate page was intended

The fix is ambient identity — the user always sees WHO they are and WHERE content is going, without having to navigate to settings to check.

---

## IdentityBar Component

**File:** `components/publishing/identity-bar.tsx`

```
┌─────────────────────────────────────────────────────────────────────┐
│  [AG] Amlon Group ▾    │  LinkedIn: ☑ Corporate  ☑ CEO    X: ☑ @amlon │
└─────────────────────────────────────────────────────────────────────┘
```

### Left side — workspace identity

- Avatar (initials + brand_color background, or avatar_url image)
- Workspace name
- Chevron — clicking opens the workspace switcher popover (same Radix Popover component from Spec 1)
- Navigating to a new workspace from this popover always goes to `/${newSlug}/dashboard`. (Cannot carry the current path — e.g. `/amlon/studio/abc123` contains an output ID scoped to Amlon's workspace that wouldn't exist in the target workspace.)

### Right side — publishing accounts

- All connected channel accounts for the active workspace, grouped by channel
- Checkbox per account: checked = will publish to this account
- Disabled/greyed if no accounts connected for a channel (with "Connect" link to `/[slug]/settings/publishing`)
- Selection persisted to `localStorage` keyed by `workspaceId` so the user's last-used combination is remembered across sessions

### Component API

```tsx
interface IdentityBarProps {
  outputId?: string  // if present, pre-select accounts from last publish of this output
}

export function IdentityBar({ outputId }: IdentityBarProps)
```

### Data

```ts
// hooks/use-publishing-accounts.ts
export function usePublishingAccounts(workspaceId: string): {
  accounts: PublishingAccount[]  // from channels + channel_credentials
  selected: Set<string>          // selected channel_credential ids
  toggle: (id: string) => void
}
```

Fetches `GET /api/publishing/accounts?workspaceId=xxx` — returns channels with their connected credentials for the workspace. The existing `channel_credentials` and `channels` tables have all the data needed; no schema changes required.

---

## Integration Points

### Studio (`/[slug]/studio/[id]`)

The `IdentityBar` is placed above the editor, below the studio top bar. It replaces the current per-channel account selector in the right panel. The right panel channel selector continues to control post *format* (LinkedIn post, X thread, blog); `IdentityBar` controls which *accounts* receive it.

The selected account IDs from `IdentityBar` are passed to the publish action alongside the output ID.

### Syndicate (`/[slug]/syndicate`)

The `IdentityBar` appears above the URL input. Currently syndicate publishes to whichever accounts are connected; the bar makes selection explicit per-session.

### LinkedIn Create (`/[slug]/create/linkedin`)

This page already has an account selector. The existing selector is replaced with the `IdentityBar`'s account selection right side, standardizing the pattern across all surfaces.

---

## "Generating As" Context

In generation prompts, the active workspace's brand profile (tone, audience, voice) is already used by the generate API. The `IdentityBar` makes this visible to the user — the workspace name shown on the left side IS the brand context for generation.

No changes to the generation API are needed. The workspace context flows through `x-workspace-id` header → API route → brand profile lookup (already in place).

---

## Files Changed / Created

| File | Action |
|---|---|
| `components/publishing/identity-bar.tsx` | New |
| `hooks/use-publishing-accounts.ts` | New |
| `app/api/publishing/accounts/route.ts` | New — GET accounts for workspace |
| `app/[workspaceSlug]/(dashboard)/studio/[id]/page.tsx` | Update — add IdentityBar |
| `app/[workspaceSlug]/(dashboard)/syndicate/page.tsx` | Update — add IdentityBar |
| `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx` | Update — replace existing selector with IdentityBar |
