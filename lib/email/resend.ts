import { Resend } from 'resend'

const FROM = 'Clout Support <support@clout.so>'
const TO = 'help@clout.you'

interface SupportNotificationParams {
  category: string
  message: string
  userEmail: string | null
  workspaceId: string | null
  route: string | null
  browserInfo: string | null
  screenshotUrl: string | null
}

export async function sendSupportNotification(params: SupportNotificationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  const resend = new Resend(apiKey)
  const { category, message, userEmail, workspaceId, route, browserInfo, screenshotUrl } = params

  const categoryLabel: Record<string, string> = {
    question: 'Question',
    bug: 'Bug report',
    feature: 'Feature request',
    billing: 'Billing issue',
    call: 'Book a call',
  }

  const lines = [
    `Category: ${categoryLabel[category] ?? category}`,
    `From: ${userEmail ?? 'unknown'}`,
    `Workspace: ${workspaceId ?? 'unknown'}`,
    `Route: ${route ?? 'unknown'}`,
    '',
    message,
    '',
    screenshotUrl ? `Screenshot: ${screenshotUrl}` : null,
    browserInfo ? `Browser: ${browserInfo}` : null,
  ].filter((l) => l !== null).join('\n')

  const { error } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: `[${categoryLabel[category] ?? category}] Support request from ${userEmail ?? 'a user'}`,
    text: lines,
  })
  if (error) throw new Error(error.message)
}
