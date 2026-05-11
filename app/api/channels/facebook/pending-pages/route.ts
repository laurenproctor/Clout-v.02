import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import type { FacebookPage } from '@/lib/facebook'

interface PendingPayload {
  workspaceId: string
  pages: FacebookPage[]
  userLongLivedToken: string
  userTokenExpiresIn: number
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('fb_pending_pages')?.value
  if (!token) {
    return NextResponse.json({ error: 'no_pending_pages' }, { status: 404 })
  }

  let payload: PendingPayload
  try {
    payload = verifyCookiePayload<PendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  // Strip access_token before returning to client — only needed server-side
  const pages = payload.pages.map(({ id, name }) => ({ id, name }))
  return NextResponse.json({ pages })
}
