import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import type { FacebookPage } from '@/lib/facebook'

interface PendingPayload {
  workspaceId: string
  pages: FacebookPage[]
  userLongLivedToken: string
  userTokenExpiresIn: number
}

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}))
  const { pageId } = body as { pageId?: string }
  if (!pageId) {
    return NextResponse.json({ error: 'pageId required' }, { status: 400 })
  }

  const page = payload.pages.find(p => p.id === pageId)
  if (!page) {
    return NextResponse.json({ error: 'page_not_found' }, { status: 404 })
  }

  const { workspaceId, userLongLivedToken, userTokenExpiresIn } = payload

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'facebook',
      accountId:   page.id,
      accountType: 'page',
      label:       page.name,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  page.access_token,
      refreshToken: userLongLivedToken,   // kept to re-derive page tokens if needed
      expiresAt:    Math.floor(Date.now() / 1000) + userTokenExpiresIn,
      accountId:    page.id,
      accountName:  page.name,
      accountEmail: null,
    })

    if (!credResult.ok) {
      return NextResponse.json({ error: credResult.error }, { status: 500 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('fb_pending_pages')
  return res
}
