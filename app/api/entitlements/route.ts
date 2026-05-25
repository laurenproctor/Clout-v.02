import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getWorkspaceSlug } from '@/lib/auth/workspace-context'
import { createServiceClient } from '@/lib/supabase/service'
import {
  canCreateWorkspace,
  canConnectAccount,
  canInviteMember,
} from '@/lib/billing/entitlements'

type CheckName = 'createWorkspace' | 'connectAccount' | 'inviteMember'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const checkName = req.nextUrl.searchParams.get('check') as CheckName | null
  if (!checkName) return NextResponse.json({ error: 'check param required' }, { status: 400 })

  // Resolve workspaceId from the workspace slug in the header
  const workspaceSlug = getWorkspaceSlug(req)
  let workspaceId: string | null = null

  if (workspaceSlug) {
    const supabase = createServiceClient()
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', workspaceSlug)
      .is('deleted_at', null)
      .maybeSingle()
    workspaceId = ws?.id ?? null
  }

  let result
  switch (checkName) {
    case 'createWorkspace':
      result = await canCreateWorkspace(session.userId)
      break
    case 'connectAccount':
      if (!workspaceId) return NextResponse.json({ error: 'Workspace required' }, { status: 400 })
      result = await canConnectAccount(workspaceId)
      break
    case 'inviteMember':
      if (!workspaceId) return NextResponse.json({ error: 'Workspace required' }, { status: 400 })
      result = await canInviteMember(workspaceId)
      break
    default:
      return NextResponse.json({ error: 'Unknown check' }, { status: 400 })
  }

  return NextResponse.json({
    allowed: result.allowed,
    ...(!result.allowed ? { reason: result.reason, limit: result.limit, current: result.current } : {}),
  })
}
