# Contact Form Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing public contact form so each submission is persisted to the database, emailed to the Clout inbox, and auto-replied to the sender.

**Architecture:** A new public `POST /api/contact` route validates input (with a honeypot), inserts a row via a thin domain function, then fires two Resend emails (inbox notification + branded auto-reply) fire-and-forget. The existing client form is converted to controlled inputs that `fetch` this route. Mirrors the existing `support_requests` stack.

**Tech Stack:** Next.js 16 App Router (route handlers), Supabase (service-role client), Resend + `@react-email/components`, Vitest.

## Global Constraints

- **Next.js is non-standard here** — AGENTS.md requires reading the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. The route handler in this plan follows the exact shape of the existing [`app/api/support/route.ts`](../../../app/api/support/route.ts); deviate only after checking the docs.
- **DB access is service-role only.** New tables get RLS enabled with **no client policies**, exactly like `support_requests`.
- **Email failures must never fail a submission.** All email sends are fire-and-forget (`.catch(() => {})`). The DB row is the source of truth.
- **Notification recipient:** `hi@clout.you`. **FROM addresses:** the verified `clout.so` domain (`Clout <hi@clout.so>`), matching the existing `support@clout.so` FROM.
- **Tests:** Vitest, `environment: 'node'`. Run a single file with `npx vitest run <path>`.

---

### Task 1: `contact_submissions` migration

**Files:**
- Create: `supabase/migrations/20260618002_contact_submissions.sql`

**Interfaces:**
- Produces: a `contact_submissions` table with columns `id`, `first_name`, `last_name`, `email`, `message`, `created_at`. Task 3 inserts into it.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260618002_contact_submissions.sql` (mirrors `20260422500_support_requests.sql`):

```sql
create table if not exists contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table contact_submissions enable row level security;
-- All access via service role only — no client-facing policies needed
```

- [ ] **Step 2: Verify the file and number**

Run: `ls supabase/migrations | tail -5`
Expected: `20260618002_contact_submissions.sql` appears as the newest migration (after `20260618001`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260618002_contact_submissions.sql
git commit -m "feat(contact): add contact_submissions table migration"
```

---

### Task 2: Pure input validation + honeypot

**Files:**
- Create: `lib/contact/validate.ts`
- Test: `tests/contact/validate.test.ts`

**Interfaces:**
- Produces:
  - `interface ContactInput { firstName: string; lastName: string; email: string; message: string }`
  - `type ValidateResult = { ok: true; value: ContactInput } | { ok: false; error: string }`
  - `parseContactInput(body: unknown): ValidateResult` — trims fields, validates presence + email format, returns normalized values.
  - `isHoneypotTripped(body: unknown): boolean` — true when the hidden `company` field is non-empty.
- Consumed by: Task 5 (route).

- [ ] **Step 1: Write the failing test**

Create `tests/contact/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseContactInput, isHoneypotTripped } from '@/lib/contact/validate'

const valid = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  message: 'Hello there',
}

describe('parseContactInput', () => {
  it('accepts and trims valid input', () => {
    const r = parseContactInput({
      firstName: '  Jane ',
      lastName: ' Doe ',
      email: ' jane@example.com ',
      message: '  Hello there  ',
    })
    expect(r).toEqual({ ok: true, value: valid })
  })

  it('rejects a non-object body', () => {
    expect(parseContactInput(null)).toEqual({ ok: false, error: 'Invalid request body' })
    expect(parseContactInput('nope')).toEqual({ ok: false, error: 'Invalid request body' })
  })

  it('rejects a missing first name', () => {
    expect(parseContactInput({ ...valid, firstName: '   ' })).toEqual({
      ok: false,
      error: 'First name is required',
    })
  })

  it('rejects a missing last name', () => {
    expect(parseContactInput({ ...valid, lastName: '' })).toEqual({
      ok: false,
      error: 'Last name is required',
    })
  })

  it('rejects a missing email', () => {
    expect(parseContactInput({ ...valid, email: '' })).toEqual({
      ok: false,
      error: 'Email is required',
    })
  })

  it('rejects a malformed email', () => {
    expect(parseContactInput({ ...valid, email: 'not-an-email' })).toEqual({
      ok: false,
      error: 'A valid email is required',
    })
  })

  it('rejects a missing message', () => {
    expect(parseContactInput({ ...valid, message: '  ' })).toEqual({
      ok: false,
      error: 'Message is required',
    })
  })
})

describe('isHoneypotTripped', () => {
  it('is false when company is absent or empty', () => {
    expect(isHoneypotTripped(valid)).toBe(false)
    expect(isHoneypotTripped({ ...valid, company: '   ' })).toBe(false)
    expect(isHoneypotTripped(null)).toBe(false)
  })

  it('is true when company is filled', () => {
    expect(isHoneypotTripped({ ...valid, company: 'Acme Bots' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact/validate.test.ts`
Expected: FAIL — cannot resolve `@/lib/contact/validate`.

- [ ] **Step 3: Write the implementation**

Create `lib/contact/validate.ts`:

```ts
export interface ContactInput {
  firstName: string
  lastName: string
  email: string
  message: string
}

export type ValidateResult =
  | { ok: true; value: ContactInput }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isHoneypotTripped(body: unknown): boolean {
  const b = asObject(body)
  return b ? str(b.company).length > 0 : false
}

export function parseContactInput(body: unknown): ValidateResult {
  const b = asObject(body)
  if (!b) return { ok: false, error: 'Invalid request body' }

  const firstName = str(b.firstName)
  const lastName = str(b.lastName)
  const email = str(b.email)
  const message = str(b.message)

  if (!firstName) return { ok: false, error: 'First name is required' }
  if (!lastName) return { ok: false, error: 'Last name is required' }
  if (!email) return { ok: false, error: 'Email is required' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' }
  if (!message) return { ok: false, error: 'Message is required' }

  return { ok: true, value: { firstName, lastName, email, message } }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/contact/validate.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/contact/validate.ts tests/contact/validate.test.ts
git commit -m "feat(contact): pure input validation + honeypot helper"
```

---

### Task 3: Domain insert (`createContactSubmission`)

**Files:**
- Create: `lib/domain/contact.ts`
- Test: `tests/contact/createContactSubmission.test.ts`

**Interfaces:**
- Consumes: `createServiceClient` from `@/lib/supabase/service`; `DomainResult` from `@/types/domain`.
- Produces: `createContactSubmission(params: { firstName: string; lastName: string; email: string; message: string }): Promise<DomainResult<{ id: string }>>`. Maps camelCase params to the table's snake_case columns. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `tests/contact/createContactSubmission.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { createContactSubmission } from '@/lib/domain/contact'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function buildClient(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const from = vi.fn(() => ({ insert }))
  return { client: { from } as unknown, insert }
}

const params = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', message: 'Hi' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createContactSubmission', () => {
  it('inserts snake_case columns and returns the new id', async () => {
    const { client, insert } = buildClient({ data: { id: 'abc-123' }, error: null })
    mockCreateServiceClient.mockReturnValue(client as never)

    const result = await createContactSubmission(params)

    expect(insert).toHaveBeenCalledWith({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      message: 'Hi',
    })
    expect(result).toEqual({ ok: true, data: { id: 'abc-123' } })
  })

  it('returns the error message when the insert fails', async () => {
    const { client } = buildClient({ data: null, error: { message: 'boom' } })
    mockCreateServiceClient.mockReturnValue(client as never)

    const result = await createContactSubmission(params)

    expect(result).toEqual({ ok: false, error: 'boom' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact/createContactSubmission.test.ts`
Expected: FAIL — cannot resolve `@/lib/domain/contact`.

- [ ] **Step 3: Write the implementation**

Create `lib/domain/contact.ts` (mirrors `lib/domain/support.ts`):

```ts
import { createServiceClient } from '@/lib/supabase/service'
import type { DomainResult } from '@/types/domain'

interface CreateContactSubmissionParams {
  firstName: string
  lastName: string
  email: string
  message: string
}

export async function createContactSubmission(
  params: CreateContactSubmissionParams
): Promise<DomainResult<{ id: string }>> {
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contact_submissions')
    .insert({
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      message: params.message,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: (error as { message: string }).message }
  return { ok: true, data: { id: (data as { id: string }).id } }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/contact/createContactSubmission.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add lib/domain/contact.ts tests/contact/createContactSubmission.test.ts
git commit -m "feat(contact): createContactSubmission domain insert"
```

---

### Task 4: Emails — auto-reply template + two senders

**Files:**
- Create: `lib/email/templates/contact-received.tsx`
- Modify: `lib/email/resend.ts` (add two exported senders + one import)
- Test: `tests/contact/contactEmail.test.ts`

**Interfaces:**
- Produces (template):
  - `renderHtml(props: { firstName: string }): Promise<string>`
  - `renderText(props: { firstName: string }): string`
- Produces (resend.ts):
  - `sendContactNotification(params: { firstName: string; lastName: string; email: string; message: string }): Promise<void>` — emails `hi@clout.you`, `replyTo` the submitter.
  - `sendContactAutoReply(params: { firstName: string; email: string }): Promise<void>` — emails the submitter the rendered template.
- Both senders throw on Resend error and on missing `RESEND_API_KEY`. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `tests/contact/contactEmail.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Resend } from 'resend'
import { renderText, renderHtml } from '@/lib/email/templates/contact-received'
import { sendContactNotification, sendContactAutoReply } from '@/lib/email/resend'

vi.mock('resend', () => ({ Resend: vi.fn() }))

const send = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'test-key'
  send.mockResolvedValue({ data: { id: 'eml_1' }, error: null })
  vi.mocked(Resend).mockImplementation(() => ({ emails: { send } }) as never)
})

describe('contact-received template', () => {
  it('renderText includes the first name', () => {
    expect(renderText({ firstName: 'Jane' })).toContain('Jane')
  })

  it('renderHtml includes the first name', async () => {
    const html = await renderHtml({ firstName: 'Jane' })
    expect(html).toContain('Jane')
  })
})

describe('sendContactNotification', () => {
  it('emails the Clout inbox with the submitter as reply-to', async () => {
    await sendContactNotification({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      message: 'Hello',
    })
    expect(send).toHaveBeenCalledTimes(1)
    const arg = send.mock.calls[0][0]
    expect(arg.to).toBe('hi@clout.you')
    expect(arg.from).toContain('clout.so')
    expect(arg.replyTo).toBe('jane@example.com')
    expect(arg.text).toContain('Hello')
  })

  it('throws when Resend returns an error', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'bad' } })
    await expect(
      sendContactNotification({ firstName: 'J', lastName: 'D', email: 'j@e.com', message: 'x' })
    ).rejects.toThrow('bad')
  })
})

describe('sendContactAutoReply', () => {
  it('emails the submitter the rendered template', async () => {
    await sendContactAutoReply({ firstName: 'Jane', email: 'jane@example.com' })
    const arg = send.mock.calls[0][0]
    expect(arg.to).toBe('jane@example.com')
    expect(arg.from).toContain('clout.so')
    expect(arg.html).toContain('Jane')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact/contactEmail.test.ts`
Expected: FAIL — cannot resolve `@/lib/email/templates/contact-received` (and the new senders).

- [ ] **Step 3: Create the template**

Create `lib/email/templates/contact-received.tsx` (mirrors `welcome.tsx`):

```tsx
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface ContactReceivedProps {
  firstName: string
}

function ContactReceivedEmail({ firstName }: ContactReceivedProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanks for reaching out to Clout — we&apos;ll be in touch.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Thanks, {firstName} — we got your message.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            We&apos;ve received your note and a member of the Clout team will get back to you shortly.
          </Text>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            In the meantime, feel free to reply directly to this email if there&apos;s anything you&apos;d like to add.
          </Text>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You&apos;re receiving this because you contacted Clout via clout.you/contact.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHtml(props: ContactReceivedProps): Promise<string> {
  return render(<ContactReceivedEmail {...props} />)
}

export function renderText({ firstName }: ContactReceivedProps): string {
  return `Thanks, ${firstName} — we got your message.

We've received your note and a member of the Clout team will get back to you shortly.

In the meantime, feel free to reply directly to this email if there's anything you'd like to add.
`
}
```

- [ ] **Step 4: Add the two senders to `lib/email/resend.ts`**

At the top of `lib/email/resend.ts`, after the existing `import { Resend } from 'resend'`, add:

```ts
import { renderHtml, renderText } from '@/lib/email/templates/contact-received'

const CONTACT_FROM = 'Clout <hi@clout.so>'
const CONTACT_TO = 'hi@clout.you'
```

Then append these two functions to the end of the file:

```ts
interface ContactNotificationParams {
  firstName: string
  lastName: string
  email: string
  message: string
}

export async function sendContactNotification(params: ContactNotificationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  const resend = new Resend(apiKey)
  const { firstName, lastName, email, message } = params

  const text = [
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    '',
    message,
  ].join('\n')

  const { error } = await resend.emails.send({
    from: CONTACT_FROM,
    to: CONTACT_TO,
    replyTo: email,
    subject: `New contact form submission from ${firstName} ${lastName}`,
    text,
  })
  if (error) throw new Error(error.message)
}

export async function sendContactAutoReply(params: { firstName: string; email: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  const resend = new Resend(apiKey)
  const { firstName, email } = params

  const html = await renderHtml({ firstName })
  const text = renderText({ firstName })

  const { error } = await resend.emails.send({
    from: CONTACT_FROM,
    to: email,
    subject: 'Thanks for reaching out to Clout',
    html,
    text,
  })
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/contact/contactEmail.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add lib/email/templates/contact-received.tsx lib/email/resend.ts tests/contact/contactEmail.test.ts
git commit -m "feat(contact): inbox notification + branded auto-reply emails"
```

---

### Task 5: Public `POST /api/contact` route

**Files:**
- Create: `app/api/contact/route.ts`
- Test: `tests/contact/route.test.ts`

**Interfaces:**
- Consumes: `parseContactInput`, `isHoneypotTripped` (Task 2); `createContactSubmission` (Task 3); `sendContactNotification`, `sendContactAutoReply` (Task 4).
- Produces: `POST(req: NextRequest)` returning `{ ok: true }` (200), or `{ error }` with 400 (bad input / honeypot is silent-200) / 500 (DB error). No auth.

- [ ] **Step 1: Write the failing test**

Create `tests/contact/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/domain/contact', () => ({ createContactSubmission: vi.fn() }))
vi.mock('@/lib/email/resend', () => ({
  sendContactNotification: vi.fn(),
  sendContactAutoReply: vi.fn(),
}))

import { POST } from '@/app/api/contact/route'
import { createContactSubmission } from '@/lib/domain/contact'
import { sendContactNotification, sendContactAutoReply } from '@/lib/email/resend'

const mockCreate = vi.mocked(createContactSubmission)
const mockNotify = vi.mocked(sendContactNotification)
const mockAutoReply = vi.mocked(sendContactAutoReply)

const valid = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  message: 'Hello there',
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({ ok: true, data: { id: 'row-1' } })
  mockNotify.mockResolvedValue(undefined)
  mockAutoReply.mockResolvedValue(undefined)
})

describe('POST /api/contact', () => {
  it('stores the submission and sends both emails on success', async () => {
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockCreate).toHaveBeenCalledWith(valid)
    expect(mockNotify).toHaveBeenCalledWith(valid)
    expect(mockAutoReply).toHaveBeenCalledWith({ firstName: 'Jane', email: 'jane@example.com' })
  })

  it('silently accepts honeypot submissions without storing or emailing', async () => {
    const res = await POST(makeReq({ ...valid, company: 'Acme Bots' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid input', async () => {
    const res = await POST(makeReq({ ...valid, email: 'nope' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'A valid email is required' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 500 when the insert fails', async () => {
    mockCreate.mockResolvedValue({ ok: false, error: 'db down' })
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db down' })
  })

  it('still succeeds when an email send rejects', async () => {
    mockNotify.mockRejectedValue(new Error('resend down'))
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact/route.test.ts`
Expected: FAIL — cannot resolve `@/app/api/contact/route`.

- [ ] **Step 3: Write the route**

Create `app/api/contact/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { parseContactInput, isHoneypotTripped } from '@/lib/contact/validate'
import { createContactSubmission } from '@/lib/domain/contact'
import { sendContactNotification, sendContactAutoReply } from '@/lib/email/resend'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Honeypot — pretend success so bots don't retry, but store/send nothing.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = parseContactInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const result = await createContactSubmission(parsed.value)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Fire-and-forget — email failures must not fail the submission.
  sendContactNotification(parsed.value).catch(() => {})
  sendContactAutoReply({ firstName: parsed.value.firstName, email: parsed.value.email }).catch(() => {})

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/contact/route.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/api/contact/route.ts tests/contact/route.test.ts
git commit -m "feat(contact): public POST /api/contact route"
```

---

### Task 6: Wire the form UI

**Files:**
- Modify: `app/(marketing)/contact/page.tsx`

**Interfaces:**
- Consumes: `POST /api/contact` (Task 5).
- Produces: the form posts real data; shows submitting/error states; keeps the existing success view on `res.ok`.

- [ ] **Step 1: Replace the component state block**

In `app/(marketing)/contact/page.tsx`, replace the single state line:

```tsx
  const [sent, setSent] = useState(false)
```

with the controlled-form state and submit handler:

```tsx
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
    company: '', // honeypot — must stay empty for real users
  })

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 2: Replace the `<form>` block**

Replace the entire existing `<form onSubmit={...}> … </form>` (the `else` branch of the `sent` ternary) with:

```tsx
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                    First name
                    <input style={field} placeholder="Jane" value={form.firstName} onChange={update('firstName')} required />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                    Last name
                    <input style={field} placeholder="Doe" value={form.lastName} onChange={update('lastName')} required />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                  Email
                  <input type="email" style={field} placeholder="you@company.com" value={form.email} onChange={update('email')} required />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                  How can we help?
                  <textarea rows={4} style={{ ...field, resize: 'vertical' }} placeholder="Please let us know what's on your mind." value={form.message} onChange={update('message')} required />
                </label>

                {/* Honeypot — hidden from real users; bots that fill it are silently dropped. */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>
                    Company
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.company}
                      onChange={update('company')}
                    />
                  </label>
                </div>

                {error && (
                  <p className="text-[14px]" style={{ color: '#b3261e' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
                >
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
              </form>
```

- [ ] **Step 3: Typecheck the changed file**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `app/(marketing)/contact/page.tsx`.

- [ ] **Step 4: Manual verification — API round-trip**

Start the dev server (`npm run dev`) in a separate terminal, then:

Run:
```bash
curl -s -X POST http://localhost:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","message":"Manual test"}'
```
Expected: `{"ok":true}`. Then confirm a row exists in `contact_submissions` (Supabase dashboard or `select * from contact_submissions order by created_at desc limit 1;`).

Honeypot check:
```bash
curl -s -X POST http://localhost:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","message":"x","company":"bot"}'
```
Expected: `{"ok":true}` **and no new row** in `contact_submissions`.

- [ ] **Step 5: Manual verification — browser**

Use the `run-app` skill (or open `http://localhost:3000/contact`) to: fill the form, submit, and confirm it flips to the existing "Thanks — we'll be in touch" success state. Submit an invalid email to confirm the inline error renders.

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/contact/page.tsx"
git commit -m "feat(contact): wire contact form to /api/contact"
```

---

## Final verification

- [ ] Run the full contact test suite: `npx vitest run tests/contact`
  Expected: all tests pass.
- [ ] Run the full suite to confirm no regressions: `npx vitest run`
  Expected: green (or unchanged from baseline).

## Notes / follow-ups (out of scope)

- **Resend domain:** `hi@clout.so` (and the `clout.so` domain) must be verified in Resend before the emails actually deliver in production. If only `support@clout.so` is verified, reuse that as `CONTACT_FROM`.
- No rate limiting/CAPTCHA (honeypot only, per the spec decision).
- No admin UI for `contact_submissions` — query directly.
