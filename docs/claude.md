# Claude Code — Clout Working Instructions

Read this before making any changes to the codebase.

## What Clout Does

Clout transforms raw thought leader inputs (voice memos, text dumps, URLs, structured prompts) into polished publish-ready content using profile context and proprietary Lenses — AI prompt templates that amplify a thought leader's unique worldview. It supports self-serve users and operator-assisted managed service on the same codebase.

## North Star

> Turn messy raw thoughts into publish-ready authority content in under 60 seconds.

If a change doesn't serve this, don't build it.

## Folder Conventions

| Path | What goes here |
|---|---|
| `app/(dashboard)/` | Authenticated pages. One file per route segment. |
| `app/(operator)/operator/` | Operator-only pages. URLs: `/operator/*`. |
| `app/(auth)/` | Clerk sign-in, sign-up, onboarding. |
| `app/(marketing)/` | Public landing pages. No auth. |
| `app/api/` | Route handlers. Thin: authenticate → validate → call lib/domain/ → return. |
| `components/ui/` | shadcn primitives. **Never modify directly.** Add with `npx shadcn add`. |
| `components/shell/` | Sidebar, topnav, operator sidebar. Layout only. |
| `components/[feature]/` | Feature components. Co-locate with their pages. |
| `lib/domain/` | Business logic. No Next.js or Supabase imports. Pure TypeScript. |
| `lib/supabase/client.ts` | Browser client. Use in Client Components. |
| `lib/supabase/server.ts` | Server client. Use in Server Components and route handlers. |
| `lib/supabase/service.ts` | Admin client (service role). **Only in webhook handlers and Trigger.dev jobs.** |
| `lib/trigger/` | Trigger.dev v4 task definitions. |
| `types/db.ts` | Supabase row types. Regenerate with `npx supabase gen types typescript` after schema changes. |
| `types/domain.ts` | Application-level types used across lib/domain/. |
| `supabase/schema.sql` | Authoritative DB schema. Apply via Supabase dashboard or `supabase db push`. |

## Adding a New Page

1. Create file in the correct route group: `app/(dashboard)/[page-name]/page.tsx`
2. Export a default React Server Component
3. If it belongs in the sidebar, add it to `components/shell/sidebar.tsx` navItems
4. Do not add data fetching until a domain function exists in `lib/domain/`
5. Follow the empty state pattern: centered icon, title, description, CTA button

## Adding a New Table

1. Add to `supabase/schema.sql` — enums first, then table, then indexes, then RLS
2. Add RLS policies following the `is_workspace_member / is_assigned_operator / is_super_admin` pattern
3. Add Row/Insert/Update types to `types/db.ts`
4. Add domain interface to `types/domain.ts`
5. Add domain functions to the relevant `lib/domain/` file

## Auth Rules

- Never bypass middleware — all `/dashboard` and `/operator` routes must be protected
- Never use the service role client in Server Components — use anon client + RLS
- Service role is only for: `app/api/webhooks/` handlers and Trigger.dev jobs
- Never import from `@clerk/nextjs/server` in components — only in middleware and route handlers
- The `users` table is the bridge — always look up internal UUIDs from there; never use Clerk IDs as foreign keys

## Design Rules

- Zinc color palette only. No custom colors, no gradients.
- Geist font is applied at root layout — do not override.
- Empty states: zinc-100 circle icon background + title (zinc-900) + description (zinc-500) + optional CTA.
- Buttons: `bg-zinc-900 text-white` (primary), `border border-zinc-200 text-zinc-700` (secondary).
- No animations beyond `transition-colors` on interactive elements.
- One clear visual hierarchy per page. Keep it restrained.

## API Route Pattern

```typescript
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // validate body

  const result = await domainFunction(body)
  return NextResponse.json(result)
}
```

No business logic in route handlers. If you're writing a DB query in a route file, move it to `lib/domain/`.

## What Not to Do

- **Don't add features to placeholder pages.** They exist as structure. Implement when the domain function is ready.
- **Don't wire social publishing.** Channels are modeled but no external OAuth or posting APIs in v1.
- **Don't use Supabase auth.** Clerk is the identity provider. `supabase.auth.*` is not used.
- **Don't import from lib/domain/ in components.** Components call API routes or server actions.
- **Don't hardcode plan limits.** Read from `subscriptions.entitlements` JSONB.
- **Don't create new enums without updating types/db.ts and types/domain.ts.**
- **Don't soft-delete without filtering.** Every query on soft-deletable tables needs `deleted_at is null`.

## Infrastructure Setup (required before first run)

These resources must be created manually — they are not auto-provisioned:

### Supabase Storage

Create a bucket called `voice-captures` in the Supabase dashboard:

1. Dashboard → Storage → New bucket
2. Name: `voice-captures`
3. Public: No (private)
4. File size limit: 50MB
5. Allowed MIME types: `audio/webm, audio/mp4, audio/mpeg, audio/ogg`

### Clerk Webhook

In the Clerk dashboard, create a webhook endpoint pointing to your deployed URL:

- Endpoint URL: `https://your-domain.com/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Copy the signing secret → `CLERK_WEBHOOK_SECRET` env var

Without the Clerk webhook, the `users` table will never be populated and `getSession()` will always return null.

### Stripe Webhook (when billing is live)

- Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET` env var

### Required env vars summary

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=           # for voice transcription (Whisper)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
