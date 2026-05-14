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
      .select('id, status, attempt_count')
      .eq('idempotency_key', key)
      .maybeSingle()

    if (existing?.status === 'sent') {
      await logger.info('Email already sent, skipping', { key })
      return { skipped: true }
    }

    const recipientEmail = (() => {
      switch (payload.type) {
        case 'welcome': return payload.email
        case 'output_ready': return payload.email
        case 'payment_failed': return payload.email
      }
    })()

    const userId = payload.type === 'welcome' || payload.type === 'output_ready' ? payload.userId : null
    const workspaceId = payload.type === 'payment_failed' ? payload.workspaceId : null
    const currentAttempt = (existing?.attempt_count ?? 0) + 1

    // Upsert event record (handles both first run and retries)
    const { data: event, error: upsertError } = await supabase
      .from('email_events')
      .upsert(
        {
          idempotency_key: key,
          type: payload.type,
          recipient_email: recipientEmail,
          user_id: userId,
          workspace_id: workspaceId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
          status: 'pending',
          attempt_count: currentAttempt,
          last_attempted_at: new Date().toISOString(),
          error: null,
        },
        { onConflict: 'idempotency_key' }
      )
      .select('id')
      .single()

    if (upsertError || !event) {
      throw new Error(`Failed to upsert email_events: ${upsertError?.message}`)
    }

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
