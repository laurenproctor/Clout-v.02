import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { DISCLOSURE_VERSION } from '@/lib/unipile/disclosure'

// Records the current user's acceptance of the LinkedIn beta connector disclosure for
// the active workspace. Must be called (and succeed) before the connect flow runs —
// the connect gate checks for an acceptance of the current DISCLOSURE_VERSION.
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { error } = await supabase
    .from('linkedin_connector_optins')
    .upsert(
      {
        user_id: session.userId,
        workspace_id: session.workspaceId,
        disclosure_version: DISCLOSURE_VERSION,
        accepted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,workspace_id' },
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to record acceptance' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, version: DISCLOSURE_VERSION })
}
