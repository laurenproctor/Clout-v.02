import { getCampaignContext } from '@/lib/domain/campaign'

/**
 * Resolves the fields a "save a generated variation" route should stamp onto a
 * new `outputs` row when it was created for a campaign.
 *
 * Validates ownership: a client-provided `campaignId` must resolve to a
 * non-archived campaign in the workspace. Returns:
 *   - { ok: true, fields } — spread `fields` into the outputs insert
 *   - { ok: false }        — campaignId was provided but is invalid/foreign; reject
 *
 * Goal precedence is respected by the caller: pass `explicitGoal` when the route
 * already has a goal; the campaign goal only fills in when none was provided.
 */
export async function resolveCampaignStamp(params: {
  campaignId: string | null | undefined
  workspaceId: string
  explicitGoal?: string | null
}): Promise<
  | { ok: true; fields: { campaign_id?: string; goal?: string } }
  | { ok: false }
> {
  const { campaignId, workspaceId, explicitGoal } = params
  if (!campaignId) return { ok: true, fields: {} }

  const context = await getCampaignContext(campaignId, workspaceId)
  if (!context) return { ok: false }

  const goal = explicitGoal ?? context.goal
  return { ok: true, fields: { campaign_id: campaignId, ...(goal && { goal }) } }
}
