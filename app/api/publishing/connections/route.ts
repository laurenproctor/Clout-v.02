import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { listConnections, createConnection } from '@/lib/publishing/domain'
import { getProvider } from '@/lib/publishing/registry'
import { encryptSecret } from '@/lib/security/encryption'
import { discoverSite, verifyCredentials } from '@/lib/publishing/providers/wordpress/client'
import type { PublishingProviderId } from '@/lib/publishing/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await listConnections(session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspaceId).eq('user_id', session.userId).single()

  if (!member || !['owner', 'admin'].includes(member.role as string)) {
    return NextResponse.json(
      { error: 'Only workspace owners and admins can connect publishing destinations.' },
      { status: 403 }
    )
  }

  const body = await req.json() as {
    provider?: string
    siteUrl?: string
    label?: string
    username?: string
    applicationPassword?: string
  }

  const { provider, siteUrl, label, username, applicationPassword } = body
  if (!provider || !siteUrl || !username || !applicationPassword) {
    return NextResponse.json(
      { error: 'provider, siteUrl, username, and applicationPassword are required.' },
      { status: 400 }
    )
  }

  try { getProvider(provider as PublishingProviderId) }
  catch { return NextResponse.json({ error: `Provider "${provider}" is not supported.` }, { status: 400 }) }

  const normalizedUrl = siteUrl.replace(/\/$/, '')

  try {
    const siteInfo = await discoverSite(normalizedUrl)
    await verifyCredentials(normalizedUrl, username, applicationPassword)

    const encryptedToken   = encryptSecret(applicationPassword)
    const connectionLabel  = label?.trim() || siteInfo.name || normalizedUrl

    const result = await createConnection({
      workspaceId:          session.workspaceId,
      userId:               session.userId,
      provider:             provider as PublishingProviderId,
      label:                connectionLabel,
      siteUrl:              normalizedUrl,
      encryptedAccessToken: encryptedToken,
      metadata:             { wp_username: username, site_name: siteInfo.name },
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

    // Return safe version (no token)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedAccessToken: _, createdBy: __, ...safe } = result.data
    return NextResponse.json(safe, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Connection failed.' },
      { status: 422 },
    )
  }
}
