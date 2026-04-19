# Clout — Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui (zinc palette) |
| Font | Geist |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (voice audio) |
| Async jobs | Trigger.dev v4 |
| Billing | Stripe |
| Deploy | Vercel |

## Route Groups

Single Next.js app with four route groups. No separate deployments.

```
app/
├── (marketing)/   # Public. No auth. Minimal shell.
├── (auth)/        # Clerk sign-in, sign-up, onboarding. Centered card layout.
├── (dashboard)/   # Clerk-protected. Workspace-scoped. Sidebar + topnav.
└── (operator)/    # Clerk-protected + operator_role check. Separate sidebar.
```

Operator pages live at `app/(operator)/operator/*` so URLs are `/operator/workspaces`, etc. The route group `(operator)` is just the layout wrapper.

**Middleware** (`middleware.ts`) handles two layers:
1. Clerk session: redirect to `/sign-in` if no session on protected routes
2. Operator guard: redirect to `/dashboard` if `operator_role` is absent on `/operator/*`

## Clerk + Supabase Auth Bridge

Clerk is the identity provider. Supabase provides the database. They connect via a `users` table that mirrors Clerk data.

1. Clerk issues a JWT with `sub` = Clerk user ID
2. A webhook (`POST /api/webhooks/clerk`) syncs user events into the `users` table
3. The RLS helper `auth_user_id()` reads `users.clerk_id = JWT.sub` → returns the internal UUID
4. All RLS policies call `auth_user_id()` to scope data access

**The rule:** All application code works with internal UUIDs. Clerk IDs only appear in `users.clerk_id` and the `auth_user_id()` function.

**Critical:** The webhook must fire before any user row is created. If the sync hasn't happened, `auth_user_id()` returns null and all RLS policies fail silently. Handle this in onboarding.

## Domain Layer

`lib/domain/` contains pure business logic. No Next.js, no Supabase client imports.

```
lib/domain/
├── workspace.ts   # getWorkspace, createWorkspace, getMembers
├── capture.ts     # createCapture, getCapture, listCaptures
├── lens.ts        # getLens, listLenses, createLens
├── generation.ts  # createGeneration, evaluateQuality (quality hook)
└── output.ts      # getOutput, listOutputs, updateOutput, approveOutput, createOutputVersion
```

Functions take typed inputs (from `types/domain.ts`), call Supabase via the server client, return typed outputs. API routes call domain functions — never the Supabase client directly from route handlers.

**Quality hook:** `lib/domain/generation.ts` exports `evaluateQuality(output: string): Promise<QualityScore>`. Currently a stub returning 100. This is where quality gating goes before a bad output reaches the user.

## Operator Permission Hierarchy

```
super_admin
  └── agency_operator (assigned to specific workspaces)
        └── workspace owner
              └── admin
                    └── editor
                          └── viewer
```

Enforced in two places:
1. **Middleware** — route-level: `/operator/*` requires `operator_role` in Clerk JWT metadata
2. **RLS policies** — data-level: every table policy checks `is_workspace_member()`, `is_assigned_operator()`, or `is_super_admin()`

Operators are assigned to workspaces via `workspaces.assigned_operator_id`. They do not join as `workspace_members` — they access via the `is_assigned_operator()` RLS helper.

## Async Jobs

**Trigger.dev** is the execution engine (v4 SDK, task-based API).
**`jobs` table** is the audit/state layer — every job creates a record before dispatch, updates on completion.

Jobs in v1:
- `transcribe-capture` — voice audio → transcript → written back to `captures.transcript`
- `generate-output` — capture + lens + profile → Claude API → `generations` + `outputs` records

Job stubs are in `lib/trigger/jobs/`. The Trigger.dev webhook endpoint is `POST /api/trigger`.

## RLS Design

All 13 tables have RLS enabled. Five helper functions (all `security definer`, `stable`):

- `auth_user_id()` — resolves Clerk JWT → internal UUID
- `is_workspace_member(ws_id)` — checks workspace_members table
- `workspace_role_for(ws_id)` — returns role enum for current user
- `is_operator()` — checks operator_role is not null
- `is_super_admin()` — checks operator_role = 'super_admin'
- `is_assigned_operator(ws_id)` — checks workspaces.assigned_operator_id

**Write policy:** `jobs`, `usage_events`, and `audit_logs` have no client insert policies — all writes go through the service role key (webhooks, Trigger.dev jobs only).

## Soft Deletes

`workspaces`, `users`, `lenses`, `captures`, and `outputs` have `deleted_at timestamptz`. All queries on these tables must filter `deleted_at is null`. Partial indexes use this filter so the DB enforces it at the storage level too.

## Content as JSONB

`outputs.content` is JSONB. Shape per channel:

```typescript
// LinkedIn
{ body: string, hook: string, hashtags: string[], word_count: number }

// Newsletter
{ body: string, subject: string, preview_text: string }

// X/Twitter
{ body: string, thread: string[] }
```

Shape is validated in `lib/domain/output.ts`. When a new channel is added, update the domain validator — no migration needed.
