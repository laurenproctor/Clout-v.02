import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FEATURES, SUBSTACK_CAPABILITIES, isSubstackActionEnabled } from '@/lib/features'

// Exposes Substack capability gates to the client so the UI can render locked /
// "verification pending" CTA states. SUBSTACK_* env vars are server-only, so the client
// cannot derive these itself. Contains no secrets — only boolean gate state.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    publishingEnabled: FEATURES.substackPublishing,
    directPublish:     FEATURES.substackDirectPublish,
    capabilities:      SUBSTACK_CAPABILITIES,
    actionEnabled: {
      substack_newsletter_draft:       isSubstackActionEnabled('substack_newsletter_draft'),
      substack_note_publish:           isSubstackActionEnabled('substack_note_publish'),
      substack_newsletter_publish_web: isSubstackActionEnabled('substack_newsletter_publish_web'),
      substack_newsletter_send_email:  isSubstackActionEnabled('substack_newsletter_send_email'),
    },
  })
}
