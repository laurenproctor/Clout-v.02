import { inferIntent } from './inferIntent'
import { normalizeGoal } from './normalizeGoal'
import { OUTPUT_REGISTRY } from './outputRegistry'
import { callClaudeStream, campaignPromptLines } from '@/lib/ai/generate'
import { getCampaignContext } from '@/lib/domain/campaign'
import { createClient } from '@/lib/supabase/server'
import type { InferredIntent, NormalizedGoal } from '@/types/domain'

export interface AssistantCreateParams {
  text: string
  workspaceId: string
  userId: string
  profileName?: string | null
  lensId?: string | null
  campaignId?: string | null
  overrides?: Partial<Pick<InferredIntent, 'isPrivate' | 'outputFormat' | 'intentClass' | 'suggestedChannel' | 'tone'>>
}

export interface AssistantCreateResult {
  sessionId: string
  generationId: string
  outputId: string
  legacyGenerationId: string
  stream: ReturnType<typeof callClaudeStream>
  intent: InferredIntent
  goal: NormalizedGoal
}

export async function createAssistantOutput(
  params: AssistantCreateParams
): Promise<AssistantCreateResult> {
  const supabase = await createClient()

  // 1. Infer intent
  const rawIntent = await inferIntent(params.text, params.profileName ?? undefined)
  const intent: InferredIntent = { ...rawIntent, ...params.overrides }
  const goal = normalizeGoal(intent)
  const config = OUTPUT_REGISTRY[goal.outputFormat]

  // 2. Resolve lens
  let resolvedLensId = params.lensId
  if (!resolvedLensId) {
    const { data: systemLens } = await supabase
      .from('lenses')
      .select('id, system_prompt')
      .is('workspace_id', null)
      .limit(1)
      .single()
    resolvedLensId = systemLens?.id ?? null
  }

  // 3. Load lens prompt + profile context
  const [lensResult, profileResult] = await Promise.all([
    resolvedLensId
      ? supabase.from('lenses').select('system_prompt').eq('id', resolvedLensId).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('profiles')
      .select('id, display_name, tone_notes, mental_models, philosophies, target_audiences, sample_content')
      .eq('workspace_id', params.workspaceId)
      .single(),
  ])

  const lensPrompt = (lensResult.data as { system_prompt?: string } | null)?.system_prompt ?? ''
  const profile = profileResult.data

  // Load campaign context if creating for a campaign. Validate ownership: a
  // client-provided campaignId must resolve to a non-archived campaign in this
  // workspace before we inject it or stamp it onto the output.
  let campaignContext: { goal: string; purpose: string } | null = null
  if (params.campaignId) {
    campaignContext = await getCampaignContext(params.campaignId, params.workspaceId)
    if (!campaignContext) throw new Error('Campaign not found')
  }

  // 4. Create capture
  const { data: capture } = await supabase
    .from('captures')
    .insert({
      workspace_id: params.workspaceId,
      created_by: params.userId,
      raw_content: params.text,
      source: 'text' as const,
      is_private: goal.isPrivate,
      status: 'ready',
    })
    .select('id')
    .single()

  if (!capture) throw new Error('Failed to save capture')

  // 5. Create legacy generation record (required FK for outputs table)
  const campaignBlock = campaignPromptLines(campaignContext)
  const systemPromptParts = [
    lensPrompt,
    `\nYou are assisting ${params.profileName ?? 'a thought leader'}.`,
    goal.generationHint,
    config.systemSuffix,
    `Tone: ${goal.tone}.`,
    ...(campaignBlock.length > 0 ? ['', ...campaignBlock] : []),
  ].filter(Boolean)
  const systemPrompt = systemPromptParts.join('\n')

  const { data: legacyGen } = await supabase
    .from('generations')
    .insert({
      workspace_id: params.workspaceId,
      capture_id: capture.id,
      lens_id: resolvedLensId ?? (profile?.id ?? params.userId), // fallback avoids null constraint
      profile_id: profile?.id ?? params.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: systemPrompt,
    })
    .select('id')
    .single()

  if (!legacyGen) throw new Error('Failed to create generation record')

  // 6. Create output record (empty content — route fills it after streaming)
  const { data: output } = await supabase
    .from('outputs')
    .insert({
      workspace_id: params.workspaceId,
      generation_id: legacyGen.id,
      status: 'draft',
      content: {},
      // Goal precedence: no explicit output goal here, so default from campaign.
      ...(params.campaignId && { campaign_id: params.campaignId }),
      ...(campaignContext?.goal && { goal: campaignContext.goal }),
    })
    .select('id')
    .single()

  if (!output) throw new Error('Failed to create output record')

  // 7. Create assistant session
  const { data: session } = await supabase
    .from('assistant_sessions')
    .insert({
      workspace_id: params.workspaceId,
      capture_id: capture.id,
      user_id: params.userId,
      status: 'active',
      metadata: { lensId: resolvedLensId },
    })
    .select('id')
    .single()

  if (!session) throw new Error('Failed to create assistant session')

  // 8. Save user message to session
  await supabase.from('assistant_messages').insert({
    session_id: session.id,
    workspace_id: params.workspaceId,
    role: 'user',
    content: params.text,
  })

  // 9. Create assistant_generation record
  const { data: assistantGen } = await supabase
    .from('assistant_generations')
    .insert({
      session_id: session.id,
      workspace_id: params.workspaceId,
      output_id: output.id,
      status: 'generating',
      inferred_intent: intent as unknown as import('@/types/db').Json,
      output_format: goal.outputFormat,
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      prompt_version: 'v1',
    })
    .select('id')
    .single()

  // 10. Emit generation_started event
  await supabase.from('assistant_events').insert({
    workspace_id: params.workspaceId,
    session_id: session.id,
    generation_id: assistantGen?.id ?? null,
    event_type: 'generation_started',
    payload: {
      outputFormat: goal.outputFormat,
      intentClass: goal.intentClass,
      isPrivate: goal.isPrivate,
    },
  })

  // 11. Start stream — caller reads chunks and persists final content
  const stream = callClaudeStream({
    systemPrompt,
    userMessage: params.text,
    maxTokens: config.maxTokens,
  })

  return {
    sessionId: session.id,
    generationId: assistantGen?.id ?? '',
    outputId: output.id,
    legacyGenerationId: legacyGen.id,
    stream,
    intent,
    goal,
  }
}
