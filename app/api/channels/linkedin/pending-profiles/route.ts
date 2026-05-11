import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'

interface LiProfile {
  id: string
  name: string
  email?: string
  type: 'personal' | 'page'
}

interface PendingPayload {
  workspaceId: string
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  profiles: LiProfile[]
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('li_pending_profiles')?.value
  if (!token) {
    return NextResponse.json({ error: 'no_pending_profiles' }, { status: 404 })
  }

  let payload: PendingPayload
  try {
    payload = verifyCookiePayload<PendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  // Return profiles without access tokens
  const profiles = payload.profiles.map(({ id, name, type }) => ({ id, name, type }))
  return NextResponse.json({ profiles })
}
