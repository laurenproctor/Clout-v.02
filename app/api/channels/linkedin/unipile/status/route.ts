import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FEATURES } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase/service'
import { getUnipileConnection } from '@/lib/unipile/connection'
import { DISCLOSURE_VERSION } from '@/lib/unipile/disclosure'

// Drives the LinkedIn Monitoring Beta UI: whether the connector is enabled, whether
// the user has accepted the current disclosure, and the current connection state.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!FEATURES.linkedinUnipileEnabled) {
    return NextResponse.json({ enabled: false, optedIn: false, connection: null, disclosureVersion: DISCLOSURE_VERSION })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const [{ data: optin }, connection] = await Promise.all([
    supabase
      .from('linkedin_connector_optins')
      .select('disclosure_version')
      .eq('user_id', session.userId)
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
    getUnipileConnection(session.workspaceId),
  ])

  return NextResponse.json({
    enabled: true,
    optedIn: optin?.disclosure_version === DISCLOSURE_VERSION,
    connection,
    disclosureVersion: DISCLOSURE_VERSION,
  })
}
