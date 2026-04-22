import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { createSupportRequest } from '@/lib/domain/support'
import { sendSupportNotification } from '@/lib/email/resend'

const VALID_CATEGORIES = ['question', 'bug', 'feature', 'billing', 'call'] as const

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { category, message, screenshotUrl, currentRoute, browserInfo } = body

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Fetch user email
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', session.userId)
    .single()

  const userEmail = user?.email ?? null

  const result = await createSupportRequest({
    userId: session.userId,
    workspaceId: session.workspaceId,
    category,
    message: message.trim(),
    screenshotUrl: screenshotUrl ?? null,
    userEmail,
    currentRoute: currentRoute ?? null,
    browserInfo: browserInfo ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Fire-and-forget — don't fail the request if email errors
  sendSupportNotification({
    category,
    message: message.trim(),
    userEmail,
    workspaceId: session.workspaceId,
    route: currentRoute ?? null,
    browserInfo: browserInfo ?? null,
    screenshotUrl: screenshotUrl ?? null,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
