// lib/visual/brand/loadGenerationBrandProfile.ts
//
// Loads the workspace brand profile and shapes it for the image pipeline. This is the
// single thing that was missing: no caller ever built a brandProfile, so generateImage
// always ran with `brandProfile === undefined` and ignored brand entirely. Wiring this
// into /api/visual/generate makes brand a workspace-level constraint for ALL
// content-derived/variation generation (Instagram, etc.), not a per-platform patch.
//
// Returns the normalized BrandSemanticProfile EXTENDED with the raw camelCase render
// fields that generateImage reads off the object (it casts `brandProfile as
// Record<string, unknown>` and pulls fontHeading/primaryColor/etc). normalizeBrandIdentity
// alone does NOT carry those, so without this extension the composited image silently
// falls back to system-ui fonts and default colors.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'
import type { BrandSemanticProfile } from '../types/visual'
import { normalizeBrandIdentity, type ImageryRow, type IdentityRow } from './normalizeBrandIdentity'

/** Raw render fields generateImage reads off the brandProfile object (camelCase). */
export interface BrandRenderFields {
  fontHeading?:            string
  fontBody?:               string
  fontHeadingUrl?:         string
  fontBodyUrl?:            string
  primaryColor?:           string
  secondaryColor?:         string
  accentColor?:            string
  signatureTemplateId?:    string
  styleTrait_borderRadius?: string
}

export type GenerationBrandProfile = BrandSemanticProfile & BrandRenderFields

/**
 * Which DB rows backed the profile — recorded on the generated asset for QA
 * ("why didn't this look branded?").
 */
export interface BrandProfileSources {
  identity: boolean
  imagery:  boolean
}

export interface LoadedBrandProfile {
  profile: GenerationBrandProfile
  sources: BrandProfileSources
}

type IdentitySelect = {
  primary_color:        string | null
  secondary_color:      string | null
  accent_color:         string | null
  font_heading:         string | null
  font_body:            string | null
  font_heading_url:     string | null
  font_body_url:        string | null
  tone_traits:          string[] | null
  style_traits:         unknown
  signature_template_id: string | null
}

type ImagerySelect = {
  visual_styles:      string[] | null
  imagery_type:       string | null
  composition:        string | null
  overlay_text_style: string | null
  mood_traits:        string[] | null
  negative_rules:     string[] | null
}

/**
 * Load + normalize the workspace brand profile for image generation.
 *
 * Partial-profile hierarchy (no null poisoning): a brand is usable if EITHER row
 * exists — users configure colors/fonts and imagery settings independently. Returns
 * `null` only when neither row exists (caller passes `undefined` to generateImage).
 */
export async function loadGenerationBrandProfile(
  workspaceId: string,
  supabase: SupabaseClient<Database>,
): Promise<LoadedBrandProfile | null> {
  const [identityRes, imageryRes] = await Promise.all([
    supabase
      .from('brand_profiles')
      .select('primary_color, secondary_color, accent_color, font_heading, font_body, font_heading_url, font_body_url, tone_traits, style_traits, signature_template_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    supabase
      .from('brand_imagery_profiles')
      .select('visual_styles, imagery_type, composition, overlay_text_style, mood_traits, negative_rules')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
  ])

  const identity = (identityRes.data ?? null) as IdentitySelect | null
  const imagery  = (imageryRes.data ?? null) as ImagerySelect | null

  // Neither configured → no brand to apply.
  if (!identity && !imagery) return null

  const identityRow: IdentityRow = identity
    ? {
        primary_color:   identity.primary_color,
        secondary_color: identity.secondary_color,
        accent_color:    identity.accent_color,
        tone_traits:     identity.tone_traits,
        style_traits:    identity.style_traits,
      }
    : null

  const imageryRow: ImageryRow = imagery
    ? {
        visual_styles:      imagery.visual_styles,
        imagery_type:       imagery.imagery_type,
        composition:        imagery.composition,
        overlay_text_style: imagery.overlay_text_style,
        mood_traits:        imagery.mood_traits,
        negative_rules:     imagery.negative_rules,
      }
    : null

  const semantic = normalizeBrandIdentity(imageryRow, identityRow)

  // Attach raw render fields (only when identity exists — fonts/colors live there).
  const borderRadius = identity?.style_traits && typeof identity.style_traits === 'object'
    ? (identity.style_traits as Record<string, unknown>).border_radius
    : undefined

  const profile: GenerationBrandProfile = {
    ...semantic,
    ...(identity && {
      fontHeading:    identity.font_heading    ?? undefined,
      fontBody:       identity.font_body       ?? undefined,
      fontHeadingUrl: identity.font_heading_url ?? undefined,
      fontBodyUrl:    identity.font_body_url   ?? undefined,
      primaryColor:   identity.primary_color   ?? undefined,
      secondaryColor: identity.secondary_color ?? undefined,
      accentColor:    identity.accent_color    ?? undefined,
      signatureTemplateId: identity.signature_template_id ?? undefined,
      styleTrait_borderRadius: typeof borderRadius === 'string' ? borderRadius : undefined,
    }),
  }

  return { profile, sources: { identity: !!identity, imagery: !!imagery } }
}
