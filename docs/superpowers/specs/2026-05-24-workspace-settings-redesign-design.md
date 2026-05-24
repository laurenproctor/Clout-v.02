# Workspace Settings Redesign — Design Spec
**Date:** 2026-05-24  
**Status:** Approved  
**Build order:** Phase 2 — depends on Multi-Workspace Core (Spec 1)

---

## Overview

The settings area at `/[slug]/settings/` is restructured as a publishing infrastructure control center. The primary additions in this spec are: a new Team page, slug editing with 30-day rate limit (detailed in Spec 1), and workspace avatar/brand color fields in the General section. Existing pages (Brand, Publishing, Signal, Billing) are pulled into the new nav structure without redesign.

---

## Settings Navigation

A persistent left nav within the settings section. Order and labels:

| Route | Label |
|---|---|
| `/[slug]/settings/workspace` | General |
| `/[slug]/settings/brand` | Brand Identity |
| `/[slug]/settings/publishing` | Publishing |
| `/[slug]/settings/feed` | Signal Intelligence |
| `/[slug]/settings/team` | Team |
| `/[slug]/settings/billing` | Billing |

The nav is added to a settings layout at `app/[workspaceSlug]/(dashboard)/settings/layout.tsx`. All existing settings pages continue to work — only Team is new.

---

## General Section (`/[slug]/settings/workspace`)

Replaces the current minimal name/slug form. Three subsections:

### Identity

- **Workspace name** — text input, editable by owner/admin, saved via `PATCH /api/workspace`
- **Workspace URL (slug)** — editable field with three-state UI (see Spec 1: slug editing). Owner/admin only.
- **Avatar** — displays initials with `brand_color` background by default. Optional image upload to Supabase Storage `workspace-avatars` bucket. Saved as `avatar_url` on the workspace row.
- **Brand color** — color picker + hex input. Saved as `brand_color` on the workspace row. Used in workspace switcher avatar background.

### Plan

- Read-only display: current plan name, renewal date (from `subscriptions`).
- Link to `/[slug]/settings/billing`.

### Danger Zone

- **Delete workspace** — owner only. Confirmation modal requires typing the slug exactly. On confirm: soft-delete the workspace (`deleted_at = NOW()`), redirect user to their next available workspace or `/onboarding` if none.

---

## Team Section (`/[slug]/settings/team`) — New Page

**File:** `app/[workspaceSlug]/(dashboard)/settings/team/page.tsx`

### Member list

Displays all `workspace_members` JOIN `users` for the active workspace:

- Avatar, full name, email
- Role badge: Owner / Admin / Editor / Viewer
- Joined date
- Role selector (dropdown) — owner-only action; cannot change own role; cannot demote the last owner
- Remove button — owner/admin action; cannot remove self if last owner

### Invite member

Form at the top of the page:
- Email input
- Role selector (Admin / Editor / Viewer — cannot invite as Owner)
- "Send invite" button — stubs the invite for now (inserts a pending record, no email delivery in this phase)

Invite record schema (add to migration):
```sql
create table workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         workspace_role not null default 'editor',
  invited_by   uuid not null references users(id),
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);
```

Pending invites appear below the member list with a "Revoke" action.

### Permissions summary

| Action | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Change member roles | ✓ | | | |
| Remove members | ✓ | ✓ | | |
| Invite members | ✓ | ✓ | | |
| Edit workspace settings | ✓ | ✓ | | |
| Create/edit content | ✓ | ✓ | ✓ | |
| View content | ✓ | ✓ | ✓ | ✓ |

---

## What Doesn't Change

The following pages are unchanged in content — they are only pulled into the new settings nav:

- **Brand Identity** (`/[slug]/settings/brand`) — existing two-tab UI (Identity + Imagery)
- **Publishing** (`/[slug]/settings/publishing`) — existing OAuth connections, account management
- **Signal Intelligence** (`/[slug]/settings/feed`) — existing feed configuration
- **Billing** (`/[slug]/settings/billing`) — existing billing/plan UI

---

## Files Changed / Created

| File | Action |
|---|---|
| `supabase/migrations/20260524_workspace_settings.sql` | New — `workspace_invites` table |
| `app/[workspaceSlug]/(dashboard)/settings/layout.tsx` | New — settings left nav |
| `app/[workspaceSlug]/(dashboard)/settings/workspace/page.tsx` | Update — add avatar, brand color, slug UI, danger zone |
| `app/[workspaceSlug]/(dashboard)/settings/team/page.tsx` | New — team management |
| `app/api/workspace/avatar/route.ts` | New — POST avatar upload |
| `app/api/workspace/invite/route.ts` | New — POST invite, DELETE revoke |
| `app/api/workspace/members/[userId]/route.ts` | New — PATCH role, DELETE remove |
