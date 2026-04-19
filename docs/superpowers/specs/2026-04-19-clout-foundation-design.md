# Clout v1 Foundation — Design Spec

**Date:** 2026-04-19
**Project:** Clout — thought leadership content platform
**Scope:** Initial repository architecture and technical foundation

## Decisions Made

### Primary User
Non-technical founders and executives. They have ideas worth sharing but don't think in workflows or pipelines. The UI must feel like a smart writing partner. This shapes every IA decision: fewer options visible at once, no jargon, direct empty states that explain the value.

### Operator Model
Two operator tiers on the same system:
- **super_admin:** Internal Clout staff. Can access any workspace.
- **agency_operator:** External agency partners. Assigned to specific client workspaces.

Operators assist clients — they don't impersonate them. Actions are audited. Permission hierarchy: super_admin → agency_operator → workspace owner → admin → editor → viewer.

### Lenses
Named prompt templates that amplify a thought leader's unique worldview. Not just tone presets — they encode a way of seeing and reasoning. Applied on top of the thought leader's profile (mental models, philosophies, tone notes). Two scopes: system (Clout-curated) and workspace (user-defined).

### Capture Modalities
Modality-agnostic: text dump, voice memo, URL, or structured short-form prompt. All normalize into the same pipeline. Source type is tracked (`capture_source` enum) but the downstream process is identical.

### Channels (v1 scope)
LinkedIn, newsletter, X/Twitter — modeled with format config JSONB. **No publishing in v1.** Channels are declared so format-aware generation can happen, not so content can be posted.

### App Shell
Option A selected: **left sidebar (220px fixed) + content area**. Most legible for non-technical users. Separate operator sidebar with distinct "Operator" badge.

### Architecture
Option A selected: **single Next.js 15 app, route groups**. Four groups: `(marketing)`, `(auth)`, `(dashboard)`, `(operator)`. Operator mode is an additive route group. Middleware handles both Clerk session and operator role guard.

### Design System
Option B selected: **light/clean**. White surfaces, zinc border system, black primary CTAs, zinc muted text, Geist font. References: Linear, Vercel dashboard. Restrained — no color splashes, no gradients.

## Architecture Summary

- **Auth:** Clerk → `users` table mirror → Supabase RLS via `auth_user_id()` helper
- **DB:** Supabase PostgreSQL, 13 tables + users, RLS on all, soft deletes on 5 tables
- **Async jobs:** Trigger.dev v4 (transcription, generation); `jobs` table as audit layer
- **Billing:** Stripe, entitlements stored as JSONB on `subscriptions` table
- **Domain layer:** `lib/domain/` — pure TypeScript, no framework deps

## Key Tradeoffs

| Decision | Tradeoff |
|---|---|
| `outputs.content` as JSONB | Flexible across channels; no DB-level type safety |
| Soft deletes everywhere | Full audit trail; every query needs `deleted_at is null` filter |
| `entitlements` as JSONB | Change plan limits without migrations; validate in domain layer |
| `jobs` table as state layer | Simple and visible; not a real queue — replace with Vercel Queues at scale |
| Trigger.dev v4 task API | Matches installed SDK; different from v3 job/client pattern |
| Single app, route groups | Simplest for v1; migrate to subdomain split with middleware if needed later |
