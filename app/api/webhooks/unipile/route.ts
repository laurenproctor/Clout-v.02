import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyConnectorToken } from '@/lib/unipile/link-token'
import { saveUnipileConnection } from '@/lib/unipile/connection'

// Unipile notify webhook (public — server-to-server, no Clerk session; exempted via
// proxy.ts `/api/webhooks(.*)`). Unipile POSTs { status, account_id, name } when a
// hosted-auth flow finishes. The `name` is an HMAC-signed token we issued, which is
// the trust boundary: a forged notification can't bind an account to a real workspace
// because it can't produce a valid signature.

interface NotifyPayload {
  status?: string
  account_id?: string
  name?: string
}

export async function POST(req: NextRequest) {
  let payload: NotifyPayload
  try {
    payload = (await req.json()) as NotifyPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only act on successful account creation. Acknowledge everything else so Unipile
  // doesn't retry; we simply don't persist.
  if (payload.status !== 'CREATION_SUCCESS' || !payload.account_id || !payload.name) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  let bound: { workspaceId: string; userId: string }
  try {
    bound = verifyConnectorToken(payload.name)
  } catch {
    // Bad/expired/forged signature — refuse to bind.
    return NextResponse.json({ error: 'Invalid correlation token' }, { status: 400 })
  }

  try {
    await saveUnipileConnection(bound.workspaceId, {
      accountId: payload.account_id,
      provider: 'linkedin',
      connectedAt: new Date().toISOString(),
      status: 'connected',
    })
  } catch (err) {
    console.error(JSON.stringify({
      event: 'unipile.notify_persist_failed',
      workspaceId: bound.workspaceId,
      error: err instanceof Error ? err.message : String(err),
    }))
    return NextResponse.json({ error: 'Persist failed' }, { status: 500 })
  }

  console.info(JSON.stringify({
    event: 'unipile.account_connected',
    workspaceId: bound.workspaceId,
    userId: bound.userId,
  }))
  return NextResponse.json({ ok: true })
}
