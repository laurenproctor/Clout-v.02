// app/api/channels/apple-business-connect/connect/route.ts
// POST — validates credentials, fetches location list, stores in signed cookie.
// Does NOT write to the database. Credentials only persist after location selection.
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signCookiePayload } from '@/lib/signed-cookie'
import { listAllLocations, type ABCLocationGroup } from '@/lib/channels/apple-business-connect/locations'
import type { ABCCredentials } from '@/lib/channels/apple-business-connect/types'

export interface ABCPendingPayload {
  workspaceId:    string
  credentials:    ABCCredentials
  locationGroups: ABCLocationGroup[]
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    keyId?:      string
    issuerId?:   string
    privateKey?: string
  }

  const { keyId, issuerId, privateKey } = body
  if (!keyId?.trim() || !issuerId?.trim() || !privateKey?.trim()) {
    return NextResponse.json(
      { error: 'keyId, issuerId, and privateKey are required' },
      { status: 400 }
    )
  }

  const creds: ABCCredentials = {
    keyId:      keyId.trim(),
    issuerId:   issuerId.trim(),
    privateKey: privateKey.trim(),
  }

  let locationGroups: ABCLocationGroup[]
  try {
    locationGroups = await listAllLocations(creds)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[abc/connect] credential validation failed:', msg)
    return NextResponse.json(
      { error: 'Invalid credentials or API error. Verify your Key ID, Issuer ID, and private key.' },
      { status: 422 }
    )
  }

  if (locationGroups.length === 0) {
    return NextResponse.json(
      { error: 'No business locations found. Ensure your account has verified locations in Apple Business Connect.' },
      { status: 422 }
    )
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
