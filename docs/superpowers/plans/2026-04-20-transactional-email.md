# Transactional Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-ready transactional email (welcome, output ready, payment failed) using Resend + React Email delivered via a single Trigger.dev dispatcher task with full observability.

**Architecture:** React Email templates in `lib/email/templates/` render HTML + plain text; `lib/email/send.ts` calls Resend and writes to `email_events`; a single Trigger.dev task `dispatch-email` handles idempotency, retries, and dispatching. Three existing locations (Clerk webhook, outputs PATCH route, Stripe webhook) trigger the task.

**Tech Stack:** `resend`, `@react-email/components`, `@trigger.dev/sdk` v4 (already installed), Supabase service client, Next.js App Router

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/email/templates/welcome.tsx` | Welcome email — HTML + plain text renders |
| Create | `lib/email/templates/output-ready.tsx` | Output ready email — HTML + plain text renders |
| Create | `lib/email/templates/payment-failed.tsx` | Payment failed email — HTML + plain text renders |
| Create | `lib/email/send.ts` | `sendEmail()` — writes email_events + calls Resend |
| Create | `lib/trigger/jobs/dispatch-email.ts` | Single dispatcher task — idempotency + retry |
| Create | `trigger.config.ts` | Trigger.dev project config pointing at jobs dir |
| Create | `app/api/trigger/route.ts` | Trigger.dev webhook receiver |
| Create | `app/api/email-events/resend/route.ts` | Operator manual resend endpoint |
| Create | `app/(operator)/operator/email-preview/page.tsx` | Template preview + failed events list |
| Modify | `supabase/schema.sql` | Add email_type enum, email_status enum, email_events table |
| Modify | `types/db.ts` | Add EmailEvent Row/Insert/Update types |
| Modify | `types/domain.ts` | Add EmailType, EmailStatus, EmailEvent, EmailPayload types |
| Modify | `app/api/webhooks/clerk/route.ts` | Dispatch welcome email on user.created |
| Modify | `app/api/outputs/[id]/route.ts` | Dispatch output_ready email on status → approved |
| Modify | `app/api/webhooks/stripe/route.ts` | Dispatch payment_failed email on invoice.payment_failed |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend and react-email**

```bash
npm install resend @react-email/components
```

Expected output: packages added to `node_modules`, `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Verify install**

```bash
node -e "require('resend'); require('@react-email/components'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install resend and react-email"
```

---

## Task 2: Database schema — email_events

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `types/db.ts`
- Modify: `types/domain.ts`

- [ ] **Step 1: Add enums and table to schema.sql**

Open `supabase/schema.sql`. After the existing `create type audit_action` block (around line 35), add:

```sql
create type email_type as enum ('welcome', 'output_ready', 'payment_failed');
create type email_status as enum ('pending', 'sent', 'failed');
```

Then after the last table definition (before any RLS section), add:

```sql
-- ============================================================
-- EMAIL EVENTS  (observability + idempotency for transactional email)
-- ============================================================
create table email_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique not null,
  type email_type not null,
  recipient_email text not null,
  user_id uuid references users(id) on delete set null,
  workspace_id uuid references workspaces(id) on delete set null,
  payload jsonb,
  status email_status not null default 'pending',
  resend_id text,
  error text,
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_events_idempotency_key_idx on email_events(idempotency_key);
create index email_events_user_id_idx on email_events(user_id);
create index email_events_workspace_id_idx on email_events(workspace_id);
create index email_events_type_status_idx on email_events(type, status);

alter table email_events enable row level security;

create policy "super_admin can read email_events"
  on email_events for select
  using (
    exists (
      select 1 from users
      where users.clerk_id = (auth.jwt() ->> 'sub')
      and users.operator_role = 'super_admin'
    )
  );
```

- [ ] **Step 2: Apply schema to Supabase**

In the Supabase dashboard SQL editor, run the new enum and table SQL above. Verify the `email_events` table and both enums appear in the schema browser.

- [ ] **Step 3: Add types to types/db.ts**

At the end of the `Database` interface's `Tables` section, add:

```typescript
      email_events: {
        Row: {
          id: string
          idempotency_key: string
          type: 'welcome' | 'output_ready' | 'payment_failed'
          recipient_email: string
          user_id: string | null
          workspace_id: string | null
          payload: Record<string, unknown> | null
          status: 'pending' | 'sent' | 'failed'
          resend_id: string | null
          error: string | null
          attempt_count: number
          last_attempted_at: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          idempotency_key: string
          type: 'welcome' | 'output_ready' | 'payment_failed'
          recipient_email: string
          user_id?: string | null
          workspace_id?: string | null
          payload?: Record<string, unknown> | null
          status?: 'pending' | 'sent' | 'failed'
          resend_id?: string | null
          error?: string | null
          attempt_count?: number
          last_attempted_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'failed'
          resend_id?: string | null
          error?: string | null
          attempt_count?: number
          last_attempted_at?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
```

- [ ] **Step 4: Add types to types/domain.ts**

After the existing enum type declarations at the top of `types/domain.ts`, add:

```typescript
export type EmailType = 'welcome' | 'output_ready' | 'payment_failed'
export type EmailStatus = 'pending' | 'sent' | 'failed'

export type EmailPayload =
  | { type: 'welcome'; userId: string; email: string; displayName: string }
  | { type: 'output_ready'; outputId: string; userId: string; email: string; outputTitle: string; outputBody: string }
  | { type: 'payment_failed'; workspaceId: string; invoiceId: string; email: string; planName: string; amount: number; currency: string; gracePeriodDays: number }

export interface EmailEvent {
  id: string
  idempotencyKey: string
  type: EmailType
  recipientEmail: string
  userId: string | null
  workspaceId: string | null
  payload: EmailPayload | null
  status: EmailStatus
  resendId: string | null
  error: string | null
  attemptCount: number
  lastAttemptedAt: string | null
  sentAt: string | null
  createdAt: string
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql types/db.ts types/domain.ts
git commit -m "feat: add email_events table schema and types"
```

---

## Task 3: Email send domain function

**Files:**
- Create: `lib/email/send.ts`

- [ ] **Step 1: Create lib/email/send.ts**

```typescript
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import type { EmailPayload } from '@/types/domain'

const resend = new Resend(process.env.RESEND_API_KEY!)

export function idempotencyKey(payload: EmailPayload): string {
  switch (payload.type) {
    case 'welcome':
      return `welcome:${payload.userId}`
    case 'output_ready':
      return `output_ready:${payload.outputId}`
    case 'payment_failed':
      return `payment_failed:${payload.workspaceId}:${payload.invoiceId}`
  }
}

export function subjectFor(payload: EmailPayload): string {
  switch (payload.type) {
    case 'welcome':
      return `Welcome to Clout, ${payload.displayName}`
    case 'output_ready':
      return 'Your output is ready'
    case 'payment_failed':
      return 'Action required: payment failed'
  }
}

interface SendEmailArgs {
  payload: EmailPayload
  html: string
  text: string
  eventId: string
}

export async function sendEmail({ payload, html, text, eventId }: SendEmailArgs): Promise<void> {
  const supabase = createServiceClient()
  const from = process.env.EMAIL_FROM!
  const subject = subjectFor(payload)

  const recipientEmail =
    payload.type === 'welcome' ? payload.email :
    payload.type === 'output_ready' ? payload.email :
    payload.email

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipientEmail,
      subject,
      html,
      text,
    })

    if (error || !data) {
      throw new Error(error?.message ?? 'Unknown Resend error')
    }

    await supabase
      .from('email_events')
      .update({
        status: 'sent',
        resend_id: data.id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', eventId)
  } catch (err) {
    await supabase
      .from('email_events')
      .update({
        status: 'failed',
        error: String(err),
      })
      .eq('id', eventId)
    throw err
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/email/send.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/email/send.ts
git commit -m "feat: add email send domain function"
```

---

## Task 4: React Email templates

**Files:**
- Create: `lib/email/templates/welcome.tsx`
- Create: `lib/email/templates/output-ready.tsx`
- Create: `lib/email/templates/payment-failed.tsx`

- [ ] **Step 1: Create welcome template**

```typescript
// lib/email/templates/welcome.tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface WelcomeProps {
  displayName: string
  appUrl: string
}

function WelcomeEmail({ displayName, appUrl }: WelcomeProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Clout — let&apos;s turn your ideas into authority content.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Welcome to Clout, {displayName}.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            Clout transforms your raw thoughts — voice memos, text dumps, URLs — into polished, publish-ready content that sounds exactly like you.
          </Text>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            Start by capturing your first idea.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={`${appUrl}/capture/new`}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Create your first capture →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You're receiving this because you signed up for Clout.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function renderHtml(props: WelcomeProps): string {
  return render(<WelcomeEmail {...props} />)
}

export function renderText({ displayName, appUrl }: WelcomeProps): string {
  return `Welcome to Clout, ${displayName}.

Clout transforms your raw thoughts into polished, publish-ready content that sounds exactly like you.

Start by capturing your first idea: ${appUrl}/capture/new
`
}
```

- [ ] **Step 2: Create output-ready template**

```typescript
// lib/email/templates/output-ready.tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface OutputReadyProps {
  outputId: string
  outputTitle: string
  outputBody: string
  appUrl: string
}

function OutputReadyEmail({ outputId, outputTitle, outputBody, appUrl }: OutputReadyProps) {
  return (
    <Html>
      <Head />
      <Preview>{outputTitle} — your output is ready to review.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Your output is ready.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 8px', fontWeight: '500' }}>
            {outputTitle}
          </Text>
          <Text style={{ color: '#52525b', fontSize: '14px', lineHeight: '22px', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const }}>
            {outputBody}
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={`${appUrl}/studio/${outputId}`}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Review in Studio →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You're receiving this because an output was approved in your Clout workspace.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function renderHtml(props: OutputReadyProps): string {
  return render(<OutputReadyEmail {...props} />)
}

export function renderText({ outputTitle, outputBody, outputId, appUrl }: OutputReadyProps): string {
  return `Your output is ready.

${outputTitle}

${outputBody}

Review in Studio: ${appUrl}/studio/${outputId}
`
}
```

- [ ] **Step 3: Create payment-failed template**

```typescript
// lib/email/templates/payment-failed.tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface PaymentFailedProps {
  planName: string
  amount: number
  currency: string
  gracePeriodDays: number
  appUrl: string
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function PaymentFailedEmail({ planName, amount, currency, gracePeriodDays, appUrl }: PaymentFailedProps) {
  const formatted = formatAmount(amount, currency)
  return (
    <Html>
      <Head />
      <Preview>Action required — your {planName} payment of {formatted} failed.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Action required: payment failed.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 8px' }}>
            We weren&apos;t able to process your <strong>{planName}</strong> payment of <strong>{formatted}</strong>.
          </Text>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            Your access continues for <strong>{gracePeriodDays} days</strong>. Please update your billing details before then to avoid interruption.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 32px' }}>
            <Button
              href={`${appUrl}/billing`}
              style={{ backgroundColor: '#18181b', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block' }}
            >
              Update billing details →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You're receiving this because a payment failed on your Clout subscription.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function renderHtml(props: PaymentFailedProps): string {
  return render(<PaymentFailedEmail {...props} />)
}

export function renderText({ planName, amount, currency, gracePeriodDays, appUrl }: PaymentFailedProps): string {
  const formatted = formatAmount(amount, currency)
  return `Action required: payment failed.

We weren't able to process your ${planName} payment of ${formatted}.

Your access continues for ${gracePeriodDays} days. Please update your billing details before then.

Update billing details: ${appUrl}/billing
`
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/email/templates/
git commit -m "feat: add welcome, output-ready, payment-failed email templates"
```

---

## Task 5: Trigger.dev dispatcher task

**Files:**
- Create: `lib/trigger/jobs/dispatch-email.ts`
- Create: `trigger.config.ts`
- Create: `app/api/trigger/route.ts`

- [ ] **Step 1: Create trigger.config.ts at project root**

```typescript
// trigger.config.ts
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  dirs: ['lib/trigger/jobs'],
})
```

- [ ] **Step 2: Create the Trigger.dev API route**

```typescript
// app/api/trigger/route.ts
import { createRequestHandler } from '@trigger.dev/sdk/v3/next'

export const { POST } = createRequestHandler()
```

- [ ] **Step 3: Create the dispatch-email task**

```typescript
// lib/trigger/jobs/dispatch-email.ts
import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'
import { idempotencyKey, sendEmail } from '@/lib/email/send'
import { renderHtml as welcomeHtml, renderText as welcomeText } from '@/lib/email/templates/welcome'
import { renderHtml as outputReadyHtml, renderText as outputReadyText } from '@/lib/email/templates/output-ready'
import { renderHtml as paymentFailedHtml, renderText as paymentFailedText } from '@/lib/email/templates/payment-failed'
import type { EmailPayload } from '@/types/domain'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clout.app'

export const dispatchEmail = task({
  id: 'dispatch-email',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: EmailPayload) => {
    const supabase = createServiceClient()
    const key = idempotencyKey(payload)

    // Idempotency check — skip if already sent
    const { data: existing } = await supabase
      .from('email_events')
      .select('id, status')
      .eq('idempotency_key', key)
      .maybeSingle()

    if (existing?.status === 'sent') {
      await logger.info('Email already sent, skipping', { key })
      return { skipped: true }
    }

    // Upsert event record (handles retries — same key, update attempt_count)
    const recipientEmail = payload.email
    const userId = payload.type === 'welcome' || payload.type === 'output_ready' ? payload.userId : null
    const workspaceId = payload.type === 'payment_failed' ? payload.workspaceId : null

    const { data: event, error: upsertError } = await supabase
      .from('email_events')
      .upsert(
        {
          idempotency_key: key,
          type: payload.type,
          recipient_email: recipientEmail,
          user_id: userId,
          workspace_id: workspaceId,
          payload: payload as unknown as Record<string, unknown>,
          status: 'pending',
          attempt_count: (existing?.status === 'failed' ? 0 : 0),
          last_attempted_at: new Date().toISOString(),
        },
        { onConflict: 'idempotency_key' }
      )
      .select('id')
      .single()

    if (upsertError || !event) {
      throw new Error(`Failed to upsert email_events: ${upsertError?.message}`)
    }

    // Increment attempt count
    await supabase
      .from('email_events')
      .update({
        attempt_count: (existing?.status === 'failed' ? 1 : 1),
        last_attempted_at: new Date().toISOString(),
        status: 'pending',
        error: null,
      })
      .eq('id', event.id)

    // Render template
    let html: string
    let text: string

    if (payload.type === 'welcome') {
      html = await welcomeHtml({ displayName: payload.displayName, appUrl: APP_URL })
      text = welcomeText({ displayName: payload.displayName, appUrl: APP_URL })
    } else if (payload.type === 'output_ready') {
      html = await outputReadyHtml({
        outputId: payload.outputId,
        outputTitle: payload.outputTitle,
        outputBody: payload.outputBody,
        appUrl: APP_URL,
      })
      text = outputReadyText({
        outputId: payload.outputId,
        outputTitle: payload.outputTitle,
        outputBody: payload.outputBody,
        appUrl: APP_URL,
      })
    } else {
      html = await paymentFailedHtml({
        planName: payload.planName,
        amount: payload.amount,
        currency: payload.currency,
        gracePeriodDays: payload.gracePeriodDays,
        appUrl: APP_URL,
      })
      text = paymentFailedText({
        planName: payload.planName,
        amount: payload.amount,
        currency: payload.currency,
        gracePeriodDays: payload.gracePeriodDays,
        appUrl: APP_URL,
      })
    }

    await sendEmail({ payload, html, text, eventId: event.id })
    await logger.info('Email dispatched', { type: payload.type, key })
    return { sent: true }
  },
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add trigger.config.ts app/api/trigger/route.ts lib/trigger/jobs/dispatch-email.ts
git commit -m "feat: add dispatch-email Trigger.dev task and route handler"
```

---

## Task 6: Wire welcome email — Clerk webhook

**Files:**
- Modify: `app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Update the Clerk webhook to dispatch welcome email on user.created**

The `user.created` branch currently only upserts the user. After the upsert succeeds, add the trigger. The full updated `user.created || user.updated` block:

```typescript
  if (type === 'user.created' || type === 'user.updated') {
    const email = getPrimaryEmail(data)
    const fullName = getFullName(data)
    const operatorRole = (data.public_metadata?.operator_role as string) ?? null

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          clerk_id: data.id,
          email,
          full_name: fullName,
          avatar_url: data.image_url ?? null,
          operator_role: operatorRole as 'super_admin' | 'agency_operator' | null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_id' }
      )

    if (error) {
      console.error('Failed to upsert user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Dispatch welcome email only on creation
    if (type === 'user.created') {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', data.id)
        .single()

      if (user) {
        const { dispatchEmail } = await import('@/lib/trigger/jobs/dispatch-email')
        await dispatchEmail.trigger({
          type: 'welcome',
          userId: user.id,
          email,
          displayName: fullName ?? email.split('@')[0],
        })
      }
    }
  }
```

Add the import at the top of the file (dynamic import is used above to avoid issues if Trigger.dev env vars are missing in dev — this is the correct pattern).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/clerk/route.ts
git commit -m "feat: dispatch welcome email on user.created"
```

---

## Task 7: Wire output_ready email — outputs PATCH route

**Files:**
- Modify: `app/api/outputs/[id]/route.ts`

- [ ] **Step 1: Update the PATCH handler to dispatch output_ready on approve**

After the `updateOutput` call succeeds and `approve` is truthy, fetch the output details and dispatch. The full updated PATCH handler:

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { content, title, status, approve, channel_id } = body

  if (content) {
    await createOutputVersion({
      outputId: id,
      content: existing.data.content,
      editedBy: session.userId,
      changeSummary: 'Manual edit',
    })
  }

  const result = await updateOutput({
    outputId: id,
    ...(content && { content: content as OutputContent }),
    ...(title !== undefined && { title }),
    ...(status && { status }),
    ...(approve && { status: 'approved', approvedBy: session.userId }),
    ...(channel_id !== undefined && { channelId: channel_id === null ? null : channel_id }),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Dispatch output_ready email when an output is approved
  if (approve) {
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', session.userId)
      .single()

    if (user) {
      const outputTitle = result.data.title ?? 'Untitled output'
      const outputBody = typeof result.data.content?.body === 'string'
        ? result.data.content.body
        : JSON.stringify(result.data.content)

      const { dispatchEmail } = await import('@/lib/trigger/jobs/dispatch-email')
      await dispatchEmail.trigger({
        type: 'output_ready',
        outputId: id,
        userId: session.userId,
        email: user.email,
        outputTitle,
        outputBody,
      })
    }
  }

  return NextResponse.json(result.data)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/outputs/[id]/route.ts
git commit -m "feat: dispatch output_ready email on output approval"
```

---

## Task 8: Wire payment_failed email — Stripe webhook

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Update the invoice.payment_failed case**

Replace the existing `invoice.payment_failed` case with:

```typescript
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('workspace_id, plan')
        .eq('stripe_customer_id', invoice.customer as string)
        .single()
      if (!existing) break

      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('workspace_id', existing.workspace_id)

      // Look up workspace owner email
      const { data: owner } = await supabase
        .from('workspace_members')
        .select('users(email)')
        .eq('workspace_id', existing.workspace_id)
        .eq('role', 'owner')
        .single()

      const ownerEmail = (owner?.users as { email: string } | null)?.email
      if (ownerEmail) {
        const { dispatchEmail } = await import('@/lib/trigger/jobs/dispatch-email')
        await dispatchEmail.trigger({
          type: 'payment_failed',
          workspaceId: existing.workspace_id,
          invoiceId: invoice.id,
          email: ownerEmail,
          planName: existing.plan,
          amount: invoice.amount_due,
          currency: invoice.currency,
          gracePeriodDays: 3,
        })
      }
      break
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: dispatch payment_failed email on Stripe invoice failure"
```

---

## Task 9: Operator manual resend API route

**Files:**
- Create: `app/api/email-events/resend/route.ts`

- [ ] **Step 1: Create the resend route**

```typescript
// app/api/email-events/resend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { dispatchEmail } from '@/lib/trigger/jobs/dispatch-email'
import type { EmailPayload } from '@/types/domain'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.operatorRole !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await req.json()
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: event, error } = await supabase
    .from('email_events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed events can be resent' }, { status: 422 })
  }

  // Reset record so dispatcher can re-attempt with same idempotency key
  await supabase
    .from('email_events')
    .update({ status: 'pending', error: null, attempt_count: 0 })
    .eq('id', eventId)

  await dispatchEmail.trigger(event.payload as unknown as EmailPayload)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/email-events/resend/route.ts
git commit -m "feat: add operator manual email resend API route"
```

---

## Task 10: Operator email preview page

**Files:**
- Create: `app/(operator)/operator/email-preview/page.tsx`

- [ ] **Step 1: Create the operator preview page**

```typescript
// app/(operator)/operator/email-preview/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { renderHtml as welcomeHtml, renderText as welcomeText } from '@/lib/email/templates/welcome'
import { renderHtml as outputReadyHtml, renderText as outputReadyText } from '@/lib/email/templates/output-ready'
import { renderHtml as paymentFailedHtml, renderText as paymentFailedText } from '@/lib/email/templates/payment-failed'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://clout.app'

const SEED = {
  welcome: { displayName: 'Alex Johnson', appUrl: APP_URL },
  output_ready: {
    outputId: 'preview-id',
    outputTitle: 'Why the best leaders think in systems, not tasks',
    outputBody: 'Most leaders are optimizing the wrong thing. They obsess over task completion when they should be designing feedback loops.\n\nA system that surfaces the right information at the right time is worth more than a hundred well-executed tasks.',
    appUrl: APP_URL,
  },
  payment_failed: {
    planName: 'Pro',
    amount: 4900,
    currency: 'usd',
    gracePeriodDays: 3,
    appUrl: APP_URL,
  },
}

type EmailType = 'welcome' | 'output_ready' | 'payment_failed'
type ViewMode = 'html' | 'text'

interface FailedEvent {
  id: string
  type: string
  recipient_email: string
  error: string | null
  attempt_count: number
  created_at: string
}

export default function EmailPreviewPage() {
  const [active, setActive] = useState<EmailType>('welcome')
  const [view, setView] = useState<ViewMode>('html')
  const [htmlContent, setHtmlContent] = useState<Record<EmailType, string>>({ welcome: '', output_ready: '', payment_failed: '' })
  const [textContent, setTextContent] = useState<Record<EmailType, string>>({ welcome: '', output_ready: '', payment_failed: '' })
  const [failedEvents, setFailedEvents] = useState<FailedEvent[]>([])
  const [resending, setResending] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      welcomeHtml(SEED.welcome),
      outputReadyHtml(SEED.output_ready),
      paymentFailedHtml(SEED.payment_failed),
    ]).then(([w, o, p]) => {
      setHtmlContent({ welcome: w, output_ready: o, payment_failed: p })
    })
    setTextContent({
      welcome: welcomeText(SEED.welcome),
      output_ready: outputReadyText(SEED.output_ready),
      payment_failed: paymentFailedText(SEED.payment_failed),
    })

    fetch('/api/operator/email-events?status=failed')
      .then(r => r.ok ? r.json() : [])
      .then(setFailedEvents)
  }, [])

  async function handleResend(eventId: string) {
    setResending(eventId)
    await fetch('/api/email-events/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    setResending(null)
    setFailedEvents(prev => prev.filter(e => e.id !== eventId))
  }

  const TABS: { key: EmailType; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'output_ready', label: 'Output Ready' },
    { key: 'payment_failed', label: 'Payment Failed' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Email Templates</h1>

      {/* Template picker */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              active === tab.key
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* HTML / Text toggle */}
      <div className="flex gap-2 mb-4">
        {(['html', 'text'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              view === v
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
            }`}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Preview */}
      {view === 'html' ? (
        <iframe
          srcDoc={htmlContent[active]}
          className="w-full h-[600px] border border-zinc-200 rounded"
          sandbox="allow-same-origin"
          title={`${active} email preview`}
        />
      ) : (
        <pre className="w-full h-[600px] overflow-auto border border-zinc-200 rounded bg-zinc-50 p-6 text-sm text-zinc-700 whitespace-pre-wrap">
          {textContent[active]}
        </pre>
      )}

      {/* Failed events */}
      {failedEvents.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Failed Sends</h2>
          <div className="space-y-2">
            {failedEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 border border-zinc-200 rounded">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{event.recipient_email}</p>
                  <p className="text-xs text-zinc-500">{event.type} · {event.attempt_count} attempt{event.attempt_count !== 1 ? 's' : ''} · {new Date(event.created_at).toLocaleString()}</p>
                  {event.error && <p className="text-xs text-red-600 mt-1">{event.error}</p>}
                </div>
                <button
                  onClick={() => handleResend(event.id)}
                  disabled={resending === event.id}
                  className="px-3 py-1 text-xs border border-zinc-200 text-zinc-700 rounded hover:border-zinc-400 transition-colors disabled:opacity-50"
                >
                  {resending === event.id ? 'Resending…' : 'Resend'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the failed events API route**

```typescript
// app/api/operator/email-events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.operatorRole !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()
  let query = supabase
    .from('email_events')
    .select('id, type, recipient_email, error, attempt_count, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 3: Add email preview to operator sidebar**

Open `components/shell/operator-sidebar.tsx` (or wherever operator nav items are defined). Add:

```typescript
{ label: 'Email', href: '/operator/email-preview', icon: Mail }
```

Import `Mail` from `lucide-react` if not already imported.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(operator)/operator/email-preview/page.tsx app/api/operator/email-events/route.ts
git commit -m "feat: add operator email preview page and failed events list"
```

---

## Task 11: Environment variables

**Files:**
- `.env.local` (not committed)

- [ ] **Step 1: Add required env vars to .env.local**

```
TRIGGER_PROJECT_ID=proj_xxxxxxxxxxxxxxxx   # from Trigger.dev dashboard → project settings
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx  # from Resend dashboard → API keys
EMAIL_FROM=hello@yourdomain.com             # must be a verified domain in Resend
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # or http://localhost:3000 in dev
```

- [ ] **Step 2: Add TRIGGER_PROJECT_ID, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL to Vercel environment variables**

In the Vercel dashboard → project → Settings → Environment Variables, add all four for Production and Preview environments.

- [ ] **Step 3: Verify dev server starts without errors**

```bash
npm run dev
```

Expected: server starts, no missing env var warnings.

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Test welcome email locally**

Start the dev server. Use `ngrok` or Clerk's webhook test tool to send a `user.created` event to `/api/webhooks/clerk`. Check:
- `email_events` table in Supabase has a new record with `status = 'sent'`
- Resend dashboard shows the email was delivered

- [ ] **Step 2: Test output_ready email**

In the app, approve an output via the Studio. Check:
- `email_events` has a record for `output_ready` with `status = 'sent'`

- [ ] **Step 3: Test payment_failed email**

Use Stripe CLI to trigger a test `invoice.payment_failed` event:

```bash
stripe trigger invoice.payment_failed
```

Check:
- `email_events` has a record for `payment_failed` with `status = 'sent'`

- [ ] **Step 4: Test idempotency**

Trigger the same Clerk `user.created` event twice for the same user. Check:
- `email_events` has exactly one `welcome` record for that user (second dispatch was skipped)

- [ ] **Step 5: Test operator preview**

Navigate to `/operator/email-preview`. Verify:
- All three template previews render
- HTML / plain text toggle works
- Any failed events appear in the Failed Sends section with a working Resend button

---

## Self-Review

**Spec coverage check:**
- ✅ Single dispatcher task (`dispatch-email`) — Task 5
- ✅ `email_events` table with enums — Task 2
- ✅ `output_ready` trigger on `approved` — Task 7
- ✅ Idempotency on all sends — Task 5 (dispatcher checks `status = 'sent'` before sending)
- ✅ HTML + plain text rendering — Tasks 3 & 4
- ✅ Operator preview route — Task 10
- ✅ Retry lifecycle — Trigger.dev `maxAttempts: 3` in Task 5, `attempt_count` incremented
- ✅ Manual resend — Task 9 (API) + Task 10 (UI)
- ✅ Trigger.dev wiring — `trigger.config.ts` + `/api/trigger` route in Task 5
- ✅ Environment variables — Task 11

**Type consistency:**
- `EmailPayload` defined in `types/domain.ts` (Task 2), used in `send.ts` (Task 3), `dispatch-email.ts` (Task 5), and resend route (Task 9) — consistent
- `idempotencyKey()` defined in `lib/email/send.ts` (Task 3), imported in `dispatch-email.ts` (Task 5) — consistent
- `renderHtml` / `renderText` exported from each template (Tasks 4), imported in dispatcher (Task 5) — consistent
- `attempt_count` column in DB (Task 2), updated in dispatcher (Task 5) — consistent
