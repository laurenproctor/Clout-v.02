import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import type { InstagramAccount } from '@/lib/instagram'

interface PendingPayload {
  workspaceId: string
  accounts: InstagramAccount[]
  userLongLivedToken: string
  userTokenExpiresIn: number
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('ig_pending_accounts')?.value
  if (!token) {
    return NextResponse.json({ error: 'no_pending_accounts' }, { status: 404 })
  }

  let payload: PendingPayload
  try {
    payload = verifyCookiePayload<PendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  const accounts = payload.accounts.map(({ id, username, name }) => ({ id, username, name }))
  return NextResponse.json({ accounts })
}
