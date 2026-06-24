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
