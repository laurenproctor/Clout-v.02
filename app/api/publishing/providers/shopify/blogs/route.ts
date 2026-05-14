import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getConnectionWithToken } from '@/lib/publishing/domain'
import { decryptSecret } from '@/lib/security/encryption'
import { listBlogs } from '@/lib/publishing/providers/shopify/client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connectionId = req.nextUrl.searchParams.get('connectionId')
  if (!connectionId) return NextResponse.json({ error: 'connectionId is required.' }, { status: 400 })

  const connResult = await getConnectionWithToken(connectionId, session.workspaceId)
  if (!connResult.ok) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 })

  const connection = connResult.data
  if (connection.provider !== 'shopify') {
    return NextResponse.json({ error: 'Connection is not a Shopify connection.' }, { status: 400 })
  }

  const shopDomain = connection.metadata['shop_domain'] as string | undefined
  if (!shopDomain) {
    return NextResponse.json({ error: 'Connection is missing shop domain. Please reconnect your store.' }, { status: 400 })
  }
  const accessToken = decryptSecret(connection.encryptedAccessToken)

  try {
    const blogs = await listBlogs(shopDomain, accessToken)
    return NextResponse.json(blogs)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch blogs.' },
      { status: 502 }
    )
  }
}
