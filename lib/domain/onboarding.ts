import { createClient } from '@/lib/supabase/server'
import type { DomainResult, OnboardingGeneration } from '@/types/domain'

export async function updateOnboardingStep(params: {
  workspaceId: string
  step: 'identity' | 'purpose' | 'beliefs' | 'channels' | 'audience'
  data: Record<string, unknown>
}): Promise<DomainResult<void>> {
  const supabase = await createClient()

  if (params.step === 'identity') {
    const { display_name, role, industry, expertise } = params.data as {
      display_name?: string
      role?: string
      industry?: string
      expertise?: string
    }
    const updateData: {
      updated_at: string
      display_name?: string
      role?: string
      industry?: string
      expertise?: string
    } = { updated_at: new Date().toISOString() }
    if (display_name !== undefined) updateData.display_name = display_name
    if (role !== undefined) updateData.role = role
    if (industry !== undefined) updateData.industry = industry
    if (expertise !== undefined) updateData.expertise = expertise

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('workspace_id', params.workspaceId)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  }

  if (params.step === 'purpose') {
    let purposeValue: string | null = null
    if (typeof params.data.purpose === 'string') {
      purposeValue = params.data.purpose
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        purpose: purposeValue,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', params.workspaceId)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  }

  if (params.step === 'beliefs') {
    let insightsValue: Record<string, string> | null = null
    if (typeof params.data.profile_insights === 'object' && params.data.profile_insights !== null) {
      insightsValue = params.data.profile_insights as Record<string, string>
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        profile_insights: insightsValue,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', params.workspaceId)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  }

  if (params.step === 'channels') {
    let channelsValue: string[] = []
    if (Array.isArray(params.data.channels)) {
      channelsValue = params.data.channels as string[]
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        channels: channelsValue,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', params.workspaceId)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  }

  if (params.step === 'audience') {
    let targetsValue: string[] = []
    if (Array.isArray(params.data.audience_targets)) {
      targetsValue = params.data.audience_targets as string[]
    }
    let perceptionValue: string[] = []
    if (Array.isArray(params.data.audience_perception)) {
      perceptionValue = params.data.audience_perception as string[]
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        audience_targets: targetsValue,
        audience_perception: perceptionValue,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', params.workspaceId)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  }

  return { ok: true, data: undefined }
}

export async function createOnboardingGeneration(params: {
  workspaceId: string
}): Promise<DomainResult<{ id: string }>> {
  const supabase = await createClient()

  // Upsert so retries are safe
  const { data, error } = await supabase
    .from('onboarding_generations')
    .upsert(
      { workspace_id: params.workspaceId, status: 'pending' },
      { onConflict: 'workspace_id' }
    )
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to create generation' }
  return { ok: true, data: { id: data.id } }
}

export async function updateOnboardingGeneration(params: {
  workspaceId: string
  positioning: string
  postIdeas: Array<{ hook: string; channel: string }>
  draftPost: string
  status: 'complete' | 'failed'
}): Promise<DomainResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_generations')
    .update({
      positioning: params.positioning,
      post_ideas: params.postIdeas,
      draft_post: params.draftPost,
      status: params.status,
    })
    .eq('workspace_id', params.workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function getOnboardingGeneration(params: {
  workspaceId: string
}): Promise<DomainResult<OnboardingGeneration | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_generations')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: true, data: null }

  return {
    ok: true,
    data: {
      id: data.id,
      workspaceId: data.workspace_id,
      positioning: data.positioning,
      postIdeas: (data.post_ideas as Array<{ hook: string; channel: string }>) ?? [],
      draftPost: data.draft_post,
      status: data.status as OnboardingGeneration['status'],
      createdAt: data.created_at,
    },
  }
}

export async function getProfileForGeneration(params: {
  workspaceId: string
}): Promise<
  DomainResult<{
    displayName: string | null
    purpose: string | null
    role: string | null
    industry: string | null
    expertise: string | null
    profileInsights: Record<string, string> | null
    channels: string[]
    audienceTargets: string[]
    audiencePerception: string[]
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'display_name, purpose, role, industry, expertise, profile_insights, channels, audience_targets, audience_perception'
    )
    .eq('workspace_id', params.workspaceId)
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Profile not found' }

  return {
    ok: true,
    data: {
      displayName: data.display_name,
      purpose: data.purpose,
      role: data.role,
      industry: data.industry,
      expertise: data.expertise,
      profileInsights: data.profile_insights as Record<string, string> | null,
      channels: data.channels ?? [],
      audienceTargets: data.audience_targets ?? [],
      audiencePerception: data.audience_perception ?? [],
    },
  }
}
