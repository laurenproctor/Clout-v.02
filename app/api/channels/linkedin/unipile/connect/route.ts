import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { evaluateUnipileConnect } from '@/lib/unipile/gates'
import { createHostedAuthLink, UnipileKilledError } from '@/lib/unipile/client'
import { signConnectorToken, CONNECTOR_LINK_TTL_SECONDS } from '@/lib/unipile/link-token'

// Starts the Unipile hosted-auth flow for the LinkedIn beta connector. Gated on
// master flag + kill switch + current-version opt-in. Redirects the user to the
// Unipile-hosted wizard; the actual account binding happens server-side in the
// notify webhook (app/api/webhooks/unipile).

async function settingsUrl(workspaceId: string, query: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  // Prefer the active-workspace slug cookie; fall back to looking the slug up by id.
  const cookieSlug = (await cookies()).get('clout-active-workspace')?.value
  let slug = cookieSlug
  if (!slug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServiceClient() as any
    const { data } = await supabase.from('workspaces').select('slug').eq('id', workspaceId).maybeSingle()
    slug = data?.slug
  }
  const base = slug ? `${appUrl}/${slug}/settings/publishing` : `${appUrl}/settings/publishing`
  return `${base}?${query}`
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await evaluateUnipileConnect({ workspaceId: session.workspaceId, userId: session.userId })
  if (!gate.allowed) {
    // Send the user back to settings with a reason rather than a raw error.
    const dest = await settingsUrl(session.workspaceId, `unipile_error=${gate.reason}`)
    return NextResponse.redirect(dest)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const name = signConnectorToken({ workspaceId: session.workspaceId, userId: session.userId })
  const expiresOn = new Date(Date.now() + CONNECTOR_LINK_TTL_SECONDS * 1000).toISOString()

  try {
    const { url } = await createHostedAuthLink({
      name,
      notifyUrl: `${appUrl}/api/webhooks/unipile`,
      successUrl: await settingsUrl(session.workspaceId, 'unipile_connected=1'),
      failureUrl: await settingsUrl(session.workspaceId, 'unipile_error=auth_failed'),
      expiresOn,
    })
    return NextResponse.redirect(url)
  } catch (err) {
    const reason = err instanceof UnipileKilledError ? 'killed' : 'link_failed'
    const dest = await settingsUrl(session.workspaceId, `unipile_error=${reason}`)
    return NextResponse.redirect(dest)
  }
}
