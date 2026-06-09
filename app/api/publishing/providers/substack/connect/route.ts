import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createConnection } from '@/lib/publishing/domain'
import { encryptSecret } from '@/lib/security/encryption'
import { authenticate, verifySession, SubstackAuthError, SubstackApiError } from '@/lib/publishing/providers/substack/client'
import { FEATURES } from '@/lib/features'

export async function POST(req: NextRequest) {
  if (!FEATURES.substackPublishing) {
    return NextResponse.json({ error: 'Substack integration is not enabled.' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspaceId).eq('user_id', session.userId).single()

  if (!member || !['owner', 'admin'].includes(member.role as string)) {
    return NextResponse.json(
      { error: 'Only workspace owners and admins can connect publishing destinations.' },
      { status: 403 },
    )
  }

  const body = await req.json() as {
    email?:     string
    password?:  string
    subdomain?: string
    label?:     string
  }

  const { email, password, subdomain, label } = body

  if (!email || !password || !subdomain) {
    return NextResponse.json(
      { error: 'email, password, and subdomain are required.' },
      { status: 400 },
    )
  }

  const normalizedSubdomain = subdomain.trim().toLowerCase().replace(/\.substack\.com.*$/i, '')

  try {
    const sessionCookie = await authenticate(email.trim(), password)
    const userInfo      = await verifySession(sessionCookie)

    const now = new Date().toISOString()
    const connectionLabel = label?.trim()
      || userInfo.publicationName
      || `${normalizedSubdomain}.substack.com`

    const result = await createConnection({
      workspaceId:          session.workspaceId,
      userId:               session.userId,
      provider:             'substack',
      label:                connectionLabel,
      siteUrl:              `https://${normalizedSubdomain}.substack.com`,
      encryptedAccessToken: encryptSecret(sessionCookie),
      metadata: {
        email:                   email.trim(),
        encrypted_password:      encryptSecret(password),
        publication_subdomain:   normalizedSubdomain,
        publication_id:          userInfo.publicationId,
        publication_name:        userInfo.publicationName ?? connectionLabel,
        session_obtained_at:     now,
        connected_at:            now,
        api_discovery_version:   '2026-06-09',
      },
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

    // Return safe version (no token)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedAccessToken: _, createdBy: __, ...safe } = result.data
    return NextResponse.json(safe, { status: 201 })
  } catch (err) {
    if (err instanceof SubstackAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof SubstackApiError) {
      return NextResponse.json({ error: err.message }, { status: err.retryable ? 503 : 422 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Connection failed.' },
      { status: 422 },
    )
  }
}
