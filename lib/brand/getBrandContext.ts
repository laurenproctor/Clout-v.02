import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

export interface BrandContext {
  brandName: string | null
  toneTraits: string[]
  visualStyles: string[]
  moodTraits: string[]
  composition: string | null
  generationNotes: string | null
  negativeRules: string[]
  // Extensible — populated when schema adds these fields:
  messagingPillars?: string[]
  positioning?: string | null
  preferredTerminology?: string[]
  bannedWords?: string[]
}

function emptyBrandContext(): BrandContext {
  return {
    brandName: null,
    toneTraits: [],
    visualStyles: [],
    moodTraits: [],
    composition: null,
    generationNotes: null,
    negativeRules: [],
  }
}

export async function getBrandContext(): Promise<BrandContext> {
  const session = await getSession()
  if (!session) return emptyBrandContext()

  const supabase = await createClient()

  const [brandResult, imageryResult] = await Promise.all([
    supabase
      .from('brand_profiles')
      .select('brand_name, tone_traits')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
    supabase
      .from('brand_imagery_profiles')
      .select('visual_styles, mood_traits, composition, generation_notes, negative_rules')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
  ])

  return {
    brandName:       brandResult.data?.brand_name ?? null,
    toneTraits:      (brandResult.data?.tone_traits ?? []) as string[],
    visualStyles:    (imageryResult.data?.visual_styles ?? []) as string[],
    moodTraits:      (imageryResult.data?.mood_traits ?? []) as string[],
    composition:     imageryResult.data?.composition ?? null,
    generationNotes: imageryResult.data?.generation_notes ?? null,
    negativeRules:   (imageryResult.data?.negative_rules ?? []) as string[],
  }
}
