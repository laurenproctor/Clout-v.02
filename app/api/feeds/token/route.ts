import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { generateFeedToken } from '@/lib/publishing/feed-token'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token   = generateFeedToken(session.workspaceId)
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const feedUrl = `${appUrl}/api/feeds/rss?w=${session.workspaceId}&t=${token}`

  return NextResponse.json({ feedUrl })
}
