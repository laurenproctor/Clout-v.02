// app/api/channels/apple-business-connect/disconnect/route.ts
// DELETE — soft-deactivates all ABC channels, deletes shared credential, clears cookie.
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteProviderCredential } from '@/lib/domain/provider-credentials'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('channels')
    .update({
      is_active:              false,
      provider_credential_id: null,
      updated_at:             new Date().toISOString(),
    })
    .eq('workspace_id', session.workspaceId)
    .eq('platform', 'apple_business_connect')

  await deleteProviderCredential(session.workspaceId, 'apple_business_connect' as never)

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('abc_pending')
  return res
}
