import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteAnalyticsConnection } from '@/lib/analytics/connections'
import { createServiceClient } from '@/lib/supabase/service'

// analytics_properties is a post-migration table absent from generated Supabase types.
interface UntypedQuery extends PromiseLike<{ error: { message: string } | null }> {
  delete(): UntypedQuery
  eq(column: string, value: unknown): UntypedQuery
}
interface UntypedClient {
  from(table: string): UntypedQuery
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteAnalyticsConnection(session.workspaceId, 'bing_wmt')

    const supabase = createServiceClient() as unknown as UntypedClient
    await supabase
      .from('analytics_properties')
      .delete()
      .eq('workspace_id', session.workspaceId)
      .eq('property_type', 'bing_wmt_site')
  } catch (err) {
    console.error('Failed to disconnect Bing WMT:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
