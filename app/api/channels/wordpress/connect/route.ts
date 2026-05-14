import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { normalizeWpUrl, validateWordPressCredentials } from '@/lib/wordpress'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { upsertChannelCredential } from '@/lib/domain/credentials'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { siteUrl, username, appPassword } = (body ?? {}) as Record<string, string>

  if (!siteUrl?.trim() || !username?.trim() || !appPassword?.trim()) {
    return NextResponse.json({ error: 'siteUrl, username, and appPassword are required' }, { status: 400 })
  }

  let normalizedUrl: string
  try {
    normalizedUrl = normalizeWpUrl(siteUrl)
    new URL(normalizedUrl) // validate URL structure
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }

  let siteName: string
  try {
    const result = await validateWordPressCredentials(normalizedUrl, username.trim(), appPassword.trim())
    siteName = result.siteName
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'invalid_credentials') {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
    }
    return NextResponse.json({ error: 'unreachable' }, { status: 422 })
  }

  const channelResult = await createOrUpdateChannelByAccountId({
    workspaceId: session.workspaceId,
    platform: 'wordpress',
    accountId: normalizedUrl,
    accountType: 'personal',
    label: siteName,
  })

  const credResult = await upsertChannelCredential({
    channelId: channelResult.channelId,
    workspaceId: session.workspaceId,
    accessToken: appPassword.trim(),
    accountName: username.trim(),
    expiresAt: null,
  })

  if (!credResult.ok) {
    return NextResponse.json({ error: 'credential_db_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, channelId: channelResult.channelId, label: siteName })
}
