// lib/pinterest/boards.ts
// Domain layer for Pinterest boards: sync from the API (never hard-deleting), default
// board management (account + campaign), ownership enforcement, and per-output board
// resolution (override -> campaign default -> account default).
// Service-role client — callable from OAuth callback, API routes, and the worker.
import { createServiceClient } from '@/lib/supabase/service'
import { listBoards } from './client'
import { getValidPinterestToken } from './credential'
import { PinterestApiError } from './types'
import type { Output } from '@/types/domain'

// pinterest_boards / pinterest_campaign_boards post-date the generated Supabase types
// (regenerated after migrations apply). Cast as the codebase does for channels.ts /
// conversations.ts until types/db.ts is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sb(): any {
  return createServiceClient()
}

export interface PinterestBoardRow {
  id: string
  boardId: string
  name: string
  privacy: string | null
  url: string | null
  isDefault: boolean
  isAvailable: boolean
}

function mapBoardRow(row: Record<string, unknown>): PinterestBoardRow {
  return {
    id:          row.id as string,
    boardId:     row.board_id as string,
    name:        row.name as string,
    privacy:     (row.privacy as string | null) ?? null,
    url:         (row.url as string | null) ?? null,
    isDefault:   !!row.is_default,
    isAvailable: !!row.is_available,
  }
}

async function getChannelWorkspace(channelId: string): Promise<string> {
  const supabase = sb()
  const { data } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', channelId)
    .single()
  if (!data) throw new PinterestApiError('Channel not found.', 404, 'missing_channel')
  return data.workspace_id as string
}

/**
 * Syncs boards from Pinterest into pinterest_boards. Boards present in the response are
 * upserted (is_available = true, last_seen_at = now). Boards absent from the response are
 * marked is_available = false — NEVER hard-deleted — so stale scheduled outputs stay
 * debuggable. Also caches a compact list on channels.config.boards for fast UI reads.
 */
export async function syncBoards(channelId: string): Promise<PinterestBoardRow[]> {
  const supabase = sb()
  const workspaceId = await getChannelWorkspace(channelId)
  const accessToken = await getValidPinterestToken(channelId, workspaceId)

  const boards = await listBoards(accessToken)
  const now = new Date().toISOString()
  const seenIds: string[] = []

  for (const board of boards) {
    seenIds.push(board.id)
    await supabase
      .from('pinterest_boards')
      .upsert(
        {
          workspace_id:    workspaceId,
          channel_id:      channelId,
          board_id:        board.id,
          name:            board.name,
          privacy:         board.privacy ?? null,
          url:             board.url ?? null,
          is_available:    true,
          last_seen_at:    now,
          last_sync_error: null,
          synced_at:       now,
        },
        { onConflict: 'channel_id,board_id' },
      )
  }

  // Mark boards that vanished from the sync as unavailable (kept, not deleted).
  let staleQuery = supabase
    .from('pinterest_boards')
    .update({ is_available: false, synced_at: now })
    .eq('channel_id', channelId)
  if (seenIds.length > 0) {
    staleQuery = staleQuery.not('board_id', 'in', `(${seenIds.map((id) => `"${id}"`).join(',')})`)
  }
  await staleQuery

  // Cache a compact list for UI reads.
  const { data: channelRow } = await supabase
    .from('channels')
    .select('config')
    .eq('id', channelId)
    .single()
  const config = (channelRow?.config ?? {}) as Record<string, unknown>
  await supabase
    .from('channels')
    .update({
      config: { ...config, boards: boards.map((b) => ({ id: b.id, name: b.name })) },
      updated_at: now,
    })
    .eq('id', channelId)

  return getBoardsForChannel(channelId)
}

export async function getBoardsForChannel(channelId: string): Promise<PinterestBoardRow[]> {
  const supabase = sb()
  const { data } = await supabase
    .from('pinterest_boards')
    .select('id, board_id, name, privacy, url, is_default, is_available')
    .eq('channel_id', channelId)
    .order('name', { ascending: true })
  return (data ?? []).map((r: Record<string, unknown>) => mapBoardRow(r))
}

/**
 * Throws unless `boardId` is a known, available board for this exact workspace + channel.
 * Prevents cross-workspace / cross-account leakage and stale references on write & publish.
 */
export async function assertBoardOwnership(params: {
  workspaceId: string
  channelId: string
  boardId: string
}): Promise<void> {
  const supabase = sb()
  const { data } = await supabase
    .from('pinterest_boards')
    .select('is_available')
    .eq('workspace_id', params.workspaceId)
    .eq('channel_id', params.channelId)
    .eq('board_id', params.boardId)
    .maybeSingle()

  if (!data) {
    throw new PinterestApiError('Pinterest board not found for this account.', 404, 'board_unavailable')
  }
  if (!data.is_available) {
    throw new PinterestApiError('This Pinterest board is no longer available.', 410, 'board_unavailable')
  }
}

export async function setAccountDefaultBoard(channelId: string, boardId: string): Promise<void> {
  const supabase = sb()
  const workspaceId = await getChannelWorkspace(channelId)
  await assertBoardOwnership({ workspaceId, channelId, boardId })

  // Single default per channel (enforced by partial unique index): clear, then set.
  await supabase.from('pinterest_boards').update({ is_default: false }).eq('channel_id', channelId)
  await supabase
    .from('pinterest_boards')
    .update({ is_default: true })
    .eq('channel_id', channelId)
    .eq('board_id', boardId)
}

export async function setCampaignDefaultBoard(
  campaignId: string,
  channelId: string,
  boardId: string,
): Promise<void> {
  const supabase = sb()
  const workspaceId = await getChannelWorkspace(channelId)
  await assertBoardOwnership({ workspaceId, channelId, boardId })

  await supabase
    .from('pinterest_campaign_boards')
    .upsert(
      { workspace_id: workspaceId, campaign_id: campaignId, channel_id: channelId, board_id: boardId },
      { onConflict: 'campaign_id,channel_id' },
    )
}

async function getCampaignDefaultBoard(campaignId: string, channelId: string): Promise<string | null> {
  const supabase = sb()
  const { data } = await supabase
    .from('pinterest_campaign_boards')
    .select('board_id')
    .eq('campaign_id', campaignId)
    .eq('channel_id', channelId)
    .maybeSingle()
  return (data?.board_id as string | null) ?? null
}

async function getAccountDefaultBoard(channelId: string): Promise<string | null> {
  const supabase = sb()
  const { data } = await supabase
    .from('pinterest_boards')
    .select('board_id')
    .eq('channel_id', channelId)
    .eq('is_default', true)
    .maybeSingle()
  return (data?.board_id as string | null) ?? null
}

/**
 * Resolves the board for an output: per-output override -> campaign default -> account
 * default. Returns the validated, available Pinterest board_id, or throws missing_board /
 * board_unavailable.
 */
export async function resolveBoardForOutput(output: Output): Promise<string> {
  if (!output.channelId) {
    throw new PinterestApiError('No Pinterest channel assigned.', 400, 'missing_channel')
  }

  const override = output.content?.pinterestBoardId
  const campaignBoard = output.campaignId
    ? await getCampaignDefaultBoard(output.campaignId, output.channelId)
    : null
  const accountBoard = await getAccountDefaultBoard(output.channelId)

  const boardId = override || campaignBoard || accountBoard
  if (!boardId) {
    throw new PinterestApiError('Choose a Pinterest board before publishing.', 400, 'missing_board')
  }

  await assertBoardOwnership({
    workspaceId: output.workspaceId,
    channelId:   output.channelId,
    boardId,
  })
  return boardId
}
