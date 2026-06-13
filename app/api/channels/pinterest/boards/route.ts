import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FEATURES } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getBoardsForChannel,
  syncBoards,
  setAccountDefaultBoard,
  setCampaignDefaultBoard,
} from '@/lib/pinterest/boards'
import { PinterestApiError } from '@/lib/pinterest/types'
import { pinterestErrorMessage } from '@/lib/pinterest/messages'

// Confirms the channel exists, is Pinterest, and belongs to the session workspace.
async function authorizeChannel(channelId: string, workspaceId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('channels')
    .select('workspace_id, platform')
    .eq('id', channelId)
    .maybeSingle()
  // 'pinterest' post-dates the generated channel_platform enum type — compare as string.
  return !!data && data.workspace_id === workspaceId && (data.platform as string) === 'pinterest'
}

export async function GET(req: NextRequest) {
  if (!FEATURES.pinterestPublishing) return NextResponse.json({ error: 'Not enabled' }, { status: 404 })
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const channelId = new URL(req.url).searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
  if (!(await authorizeChannel(channelId, session.workspaceId))) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  return NextResponse.json({ boards: await getBoardsForChannel(channelId) })
}

export async function POST(req: NextRequest) {
  if (!FEATURES.pinterestPublishing) return NextResponse.json({ error: 'Not enabled' }, { status: 404 })
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { channelId, action, boardId, campaignId } = body as {
    channelId?: string
    action?: 'sync' | 'setAccountDefault' | 'setCampaignDefault'
    boardId?: string
    campaignId?: string
  }
  if (!channelId || !action) {
    return NextResponse.json({ error: 'channelId and action are required' }, { status: 400 })
  }
  if (!(await authorizeChannel(channelId, session.workspaceId))) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  try {
    if (action === 'sync') {
      return NextResponse.json({ boards: await syncBoards(channelId) })
    }
    if (action === 'setAccountDefault') {
      if (!boardId) return NextResponse.json({ error: 'boardId is required' }, { status: 400 })
      await setAccountDefaultBoard(channelId, boardId)
      return NextResponse.json({ boards: await getBoardsForChannel(channelId) })
    }
    if (action === 'setCampaignDefault') {
      if (!boardId || !campaignId) {
        return NextResponse.json({ error: 'boardId and campaignId are required' }, { status: 400 })
      }
      await setCampaignDefaultBoard(campaignId, channelId, boardId)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    if (err instanceof PinterestApiError) {
      return NextResponse.json({ error: pinterestErrorMessage(err.code), code: err.code }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : 'Board operation failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
