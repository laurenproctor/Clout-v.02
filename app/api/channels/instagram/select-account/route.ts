import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import type { InstagramAccount } from '@/lib/instagram'

interface PendingPayload {
  workspaceId: string
  accounts: InstagramAccount[]
  userLongLivedToken: string
  userTokenExpiresIn: number
}

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}))
  const { accountId } = body as { accountId?: string }
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  }

  const account = payload.accounts.find(a => a.id === accountId)
  if (!account) {
    return NextResponse.json({ error: 'account_not_found' }, { status: 404 })
  }

  const { workspaceId, userLongLivedToken, userTokenExpiresIn } = payload

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'instagram',
      accountId:   account.id,
      accountType: 'business',
      label:       `@${account.username}`,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  userLongLivedToken,
      refreshToken: null,
      expiresAt:    Math.floor(Date.now() / 1000) + userTokenExpiresIn,
      accountId:    account.id,
      accountName:  account.username,
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
  res.cookies.delete('ig_pending_accounts')
  return res
}
