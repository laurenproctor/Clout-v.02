// app/api/channels/apple-business-connect/connect-stored/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getProviderCredential } from '@/lib/domain/provider-credentials'
import { signCookiePayload } from '@/lib/signed-cookie'
import { listAllLocations } from '@/lib/channels/apple-business-connect/locations'
import type { ABCCredentials } from '@/lib/channels/apple-business-connect/types'
import type { ABCPendingPayload } from '../connect/route'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await getProviderCredential<Record<string, unknown>>(
    session.workspaceId,
    'apple_business_connect',
  )
  if (!record) {
    return NextResponse.json({ error: 'no_credentials' }, { status: 404 })
  }

  const creds = record.data as unknown as ABCCredentials

  let locationGroups
  try {
    locationGroups = await listAllLocations(creds)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[abc/connect-stored] stored credential validation failed:', msg)
    return NextResponse.json({ error: 'validation_failed' }, { status: 422 })
  }

  const cookieValue = signCookiePayload<ABCPendingPayload>({
    workspaceId: session.workspaceId,
    credentials: creds,
    locationGroups,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('abc_pending', cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  })
  return res
}
