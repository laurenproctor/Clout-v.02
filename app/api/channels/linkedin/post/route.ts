// app/api/channels/linkedin/post/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput, updateOutput } from '@/lib/domain/output'
import { getChannelCredential, isTokenExpired, upsertChannelCredential } from '@/lib/domain/credentials'
import { createPublishLog } from '@/lib/domain/publish-log'
import { createClient } from '@/lib/supabase/server'
import { postTextToLinkedIn, refreshLinkedInToken } from '@/lib/linkedin'
import type { OutputContent } from '@/types/domain'
import type { ChannelCredential } from '@/types/credentials'

function formatLinkedInText(title: string | null, content: OutputContent): string {
  const hashtags = ((content.hashtags as string[] | undefined) ?? [])
    .map(h => `#${h}`)
    .join(' ')
  return [title, content.body, hashtags ? `\n${hashtags}` : '']
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

async function attemptPost(
  cred: ChannelCredential,
  text: string,
  channelId: string,
  workspaceId: string,
): Promise<{ postUrn: string; refreshedCred?: ChannelCredential }> {
  let activeCred = cred

  if (isTokenExpired(cred.expiresAt)) {
    if (!cred.refreshToken) {
      throw Object.assign(
        new Error('Your LinkedIn session has expired. Go to Publishing and reconnect your account.'),
        { code: 'token_expired' }
      )
    }
    try {
      const refreshed = await refreshLinkedInToken(cred.refreshToken)
      const upsertResult = await upsertChannelCredential({
        channelId,
        workspaceId,
        accessToken:  refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? cred.refreshToken,
        expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
        accountId:    cred.accountId,
        accountName:  cred.accountName,
        accountEmail: cred.accountEmail,
      })
      if (!upsertResult.ok) throw new Error('Failed to store refreshed token')
      activeCred = upsertResult.data
    } catch {
      throw Object.assign(
        new Error('Your LinkedIn session has expired. Go to Publishing and reconnect your account.'),
        { code: 'token_expired' }
      )
    }
  }

  if (!activeCred.accountId) {
    throw Object.assign(
      new Error('LinkedIn account ID is missing. Please reconnect your account.'),
      { code: 'missing_account_id' }
    )
  }

  const postUrn = await postTextToLinkedIn(activeCred.accessToken, activeCred.accountId, text)
  return { postUrn, refreshedCred: activeCred !== cred ? activeCred : undefined }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { outputId } = body as { outputId?: string }
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const outputResult = await getOutput(outputId)
  if (!outputResult.ok || outputResult.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  const output = outputResult.data

  // Idempotency — already posted
  if (output.providerPostId) {
    return NextResponse.json({ ok: true, postUrn: output.providerPostId, alreadyPublished: true })
  }

  if (!output.channelId) {
    return NextResponse.json({
      error: 'Assign a channel to this draft before publishing',
    }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: channel } = await supabase
    .from('channels')
    .select('id, platform')
    .eq('id', output.channelId)
    .eq('workspace_id', session.workspaceId)
    .single()

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  if (channel.platform !== 'linkedin') {
    return NextResponse.json({ error: 'Channel is not LinkedIn' }, { status: 400 })
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    return NextResponse.json({
      error: 'LinkedIn account not connected. Go to Publishing and connect your account.',
      code: 'not_connected',
    }, { status: 400 })
  }

  const text = formatLinkedInText(output.title, output.content as OutputContent)
  if (!text) {
    return NextResponse.json({ error: 'This draft has no content to post' }, { status: 400 })
  }

  const startedAt = Date.now()

  try {
    const { postUrn } = await attemptPost(
      credResult.data,
      text,
      output.channelId,
      session.workspaceId,
    )
    const durationMs = Date.now() - startedAt

    await updateOutput({
      outputId,
      status: 'published',
      providerPostId: postUrn,
      publishedAt: new Date().toISOString(),
    })

    await createPublishLog({
      workspaceId: session.workspaceId,
      outputId,
      channelId: output.channelId,
      platform: 'linkedin',
      status: 'success',
      providerPostId: postUrn,
      durationMs,
    })

    return NextResponse.json({ ok: true, postUrn })
  } catch (err) {
    const durationMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : 'Publish failed'
    const code = (err as { code?: string }).code ?? 'unknown'

    await createPublishLog({
      workspaceId: session.workspaceId,
      outputId,
      channelId: output.channelId,
      platform: 'linkedin',
      status: 'failed',
      errorCode: code,
      errorMessage: message,
      durationMs,
    })

    console.error('LinkedIn post error:', err)

    const httpStatus = code === 'token_expired' ? 401 : 502
    return NextResponse.json({ error: message, code }, { status: httpStatus })
  }
}
