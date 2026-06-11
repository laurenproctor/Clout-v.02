// lib/visual/types/visual.ts
// All lib/visual files import from here.

// ─── Attention mechanisms ───────────────────────────────────────────────────
// Semantic social science concepts, not aesthetic choices.
export type AttentionStrategy =
  | 'curiosity'       // creates an open loop the viewer must resolve
  | 'status'          // signals authority or social proof
  | 'urgency'         // implies time pressure or stakes
  | 'contrast'        // juxtaposes conflicting ideas or visuals
  | 'novelty'         // unexpected composition or concept
  | 'human-intimacy'  // face, eye contact, or human gesture

// ─── Render modes ───────────────────────────────────────────────────────────
// How the final image is constructed.
// Phase 1 only generates 'fully-generated'.
// 'hybrid-overlay' and 'template-composed' are Phase 2.
export type RenderMode =
  | 'fully-generated'   // pure AI generation, no overlay
  | 'hybrid-overlay'    // AI background + Clout-controlled text/graphic layer
  | 'template-composed' // primitives assembled into a deterministic layout

// ─── Generation modes ───────────────────────────────────────────────────────
// Explicit intent prevents generateImage() from accumulating conditionals.
export type GenerationMode =
  | 'content-derived'  // intent extracted from content + platform context
  | 'prompt-driven'    // caller provided a raw prompt; skip intent generation
  | 'brand-template'   // driven by workspace visual identity
  | 'reference-derived'// based on a reference image
  | 'variation'        // variation of a parent asset

// ─── Dimensions ─────────────────────────────────────────────────────────────
export type AspectRatio = 'square' | 'landscape' | 'portrait'

// Aligned with ChannelPlatform in types/domain.ts ('twitter' is 'x' here).
export type VisualPlatform = 'linkedin' | 'x' | 'instagram' | 'newsletter' | 'blog'

// ─── VisualIntent ────────────────────────────────────────────────────────────
// The Clout-specific visual brief — a communication document, not a prompt.
//
// CRITICAL: Do NOT allow prompt engineering logic to leak into this type or
// the layers that produce it. VisualIntent is the communication abstraction.
// Prompt compilation (lib/visual/prompt/) is the provider translation layer.
export interface VisualIntent {
  // Communication layer — social science
  attentionStrategy: AttentionStrategy
  viewerEmotion: string       // what the viewer should feel, in 2–4 words
  authoritySignal?: string    // how this signals credibility/expertise
  narrativeFrame?: string     // the story or tension the image implies
  scrollPattern?: string      // where the eye travels and why

  // Aesthetic layer — needed for prompt compilation
  visualConcept: string       // specific, concrete scene or visual element (not abstract)
  compositionStyle: string    // rule-of-thirds, centered subject, asymmetric tension, etc.
  colorMood: string           // e.g. desaturated blues and grays, warm amber tones
  lightingStyle: string       // e.g. soft diffused window light, high-contrast dramatic
  visualDensity: 'minimal' | 'balanced' | 'dense'

  // Composition directives
  overlayRecommendation: string // 'none' or brief description of text/data to show
  renderMode: RenderMode

  // Creative risk — prevents optimization collapse into generic AI sameness
  creativeRisk: 'safe' | 'balanced' | 'experimental'

  // Platform and constraints
  platformRationale: string   // why this approach fits the target platform
  negativeSpace: string[]     // visual elements to explicitly exclude
}

// ─── Provider interface ──────────────────────────────────────────────────────
// CRITICAL: All provider-specific heuristics and syntax must remain inside
// lib/visual/providers/ and lib/visual/prompt/. Never leak into business logic.

export interface GeneratedImage {
  providerUrl: string             // ephemeral URL from provider (~60 min validity)
  revisedPrompt?: string          // provider's content-policy rewrite (use as canonical prompt)
  provider: 'openai'
  providerMetadata?: Record<string, unknown> // moderation flags, generation IDs, timing, seed info
}

export interface ImageProvider {
  generate(input: {
    prompt: string
    aspectRatio: AspectRatio
    quality?: 'standard' | 'hd'
    seed?: number               // provider-dependent; DALL-E 3 ignores this
  }): Promise<GeneratedImage>
}

// ─── Brand semantic profile ──────────────────────────────────────────────────
// Output of normalizeBrandIdentity() — semantic interpretation of raw brand DB rows.
// Never contains raw hex values or unresolved trait lists.

export interface CanonicalTrait {
  trait:      string  // canonicalized, deduplicated trait name
  confidence: number  // 0–1; derived from how many raw inputs mapped to this trait
}

export interface BrandSemanticProfile {
  // Synthesized identity anchor — stabilizes all downstream generation decisions
  brandArchetype: string              // e.g. "Editorial Luxury", "Technical Precision"

  // Brand's relationship to time — affects pacing, styling, lighting, render energy
  temporalCharacter: 'timeless' | 'contemporary' | 'futuristic'

  // Color interpreted as visual language — never raw hex
  colorProfile: {
    temperature:       'warm' | 'cool' | 'neutral'
    contrast:          'high' | 'moderate' | 'low'
    saturation:        'muted' | 'moderate' | 'vivid'
    emotionalRegister: string   // e.g. "high authority / editorial weight"
    paletteCharacter:  string   // e.g. "deep navy foundation, restrained warm gold accent, high contrast"
  }

  // Density separated into three independent dimensions (compact ≠ minimal)
  informationDensity:      'high' | 'moderate' | 'low'
  negativeSpacePreference: 'minimal' | 'balanced' | 'generous'
  compositionComplexity:   'layered' | 'structured' | 'clean'

  // Canonicalized traits — contradiction-resolved, confidence-scored, max 5
  canonicalTraits: CanonicalTrait[]

  // Imagery direction — pass-through from brand_imagery_profiles
  visualStyles:         string[]
  imageryType:          string | null
  compositionPreference: string | null
  overlayTextStyle:     string | null
  moodTraits:           string[]
  negativeRules:        string[]
}

// ─── Strategic context types ─────────────────────────────────────────────────
export type VisualObjective = 'authority' | 'education' | 'conversation' | 'engagement' | 'emotional_resonance' | 'lead_generation'

export type LensType = 'framework' | 'authority' | 'signal'

// ─── Orchestrator input ──────────────────────────────────────────────────────
// Explicit overlay content — used by ImageCreator to composite text/logo on generated background.
// When headline or quote is present, generateImage() bypasses Claude prop extraction and forces
// hybrid-overlay. headline → editorial-hero; quote → quote-monolith.
export interface OverlayParams {
  headline?: string       // editorial-hero
  subtext?: string        // editorial-hero
  quote?: string          // quote-monolith
  attribution?: string    // quote-monolith
  logoUrl?: string
  fontHeading?: string
  fontBody?: string
  fontHeadingUrl?: string
  fontBodyUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  colorScheme?: 'light' | 'dark'
  overlayStrength?: 'subtle' | 'balanced' | 'strong'  // UX label; translated to overlayOpacity in route
  overlayOpacity?:  number                             // 0.0–1.0, preferred internal form
  textShadow?:      'none' | 'light' | 'medium' | 'strong'
  logoCorner?: import('./template').LogoCorner  // vision-selected corner; undefined = template default
}

export interface GenerateImageInput {
  mode: GenerationMode
  workspaceId: string
  outputId?: string
  parentAssetId?: string        // variation mode: links to parent in lineage tree
  generationGroupId?: string    // auto-generated if omitted — every asset must belong to a group
  variationReason?: string      // why this variation exists
  content?: string
  platform?: VisualPlatform
  emotionalTone?: string
  keyIdea?: string
  brandProfile?: BrandSemanticProfile  // normalized brand identity — produced by normalizeBrandIdentity()
  promptOverride?: string       // skips intent generation (prompt-driven mode)
  visualIntent?: VisualIntent   // caller-supplied intent (skips Claude call)
  aspectRatio?: AspectRatio
  quality?: 'standard' | 'hd'
  seed?: number                 // stored for reproducibility; passed to provider when supported
  visualObjective?: VisualObjective
  audienceFrame?: string     // e.g. 'Executives', 'Engineers', 'Investors', 'Consumers', 'Creators'
  lensType?: LensType
  backgroundMode?: 'generated' | 'uploaded' | 'solid'  // defaults to 'generated'
  suppliedBackgroundUrl?: string  // required when backgroundMode === 'uploaded'
  overlayParams?: OverlayParams   // when set: forces hybrid-overlay with user's exact text (headline or quote)
}

// ─── Persisted asset ────────────────────────────────────────────────────────
export interface VisualAsset {
  id: string
  name: string | null
  slug: string | null
  description: string | null
  workspaceId: string
  outputId: string | null
  parentAssetId: string | null
  generationGroupId: string     // always set — never null
  variationReason: string | null
  provider: 'openai'
  providerModel: string
  originalUrl: string           // Supabase Storage public URL
  prompt: string                // revised_prompt if available, else compiled prompt
  visualIntent: VisualIntent | null
  mode: GenerationMode
  renderMode: RenderMode
  aspectRatio: AspectRatio
  mimeType: string
  fileSizeBytes: number | null
  seed: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'moderated'
  createdAt: string
}
