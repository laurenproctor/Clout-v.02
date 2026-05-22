import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

// TikTok video/text post publishing is not yet implemented.
// The current OAuth flow requests `video.upload` scope, which covers video
// uploads but not direct text posts. Text post publishing via the TikTok
// Content Posting API requires the `content.post` scope and video/image media.
//
// To implement: update TIKTOK_SCOPES in lib/tiktok.ts to include `content.post`,
// prompt existing users to reconnect, and implement the video upload flow in
// lib/domain/publishing.ts using the /v2/post/publish/video/init/ endpoint.

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(
    {
      error: 'TikTok posting requires video content. Text post publishing is not yet supported.',
      code:  'media_required',
    },
    { status: 501 }
  )
}
