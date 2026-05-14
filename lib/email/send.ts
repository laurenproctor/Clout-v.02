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
  let recipientEmail: string
  switch (payload.type) {
    case 'welcome': recipientEmail = payload.email; break
    case 'output_ready': recipientEmail = payload.email; break
    case 'payment_failed': recipientEmail = payload.email; break
  }

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
