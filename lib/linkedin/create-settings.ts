// Client-safe source of truth for persisting/restoring a workspace's last-used LinkedIn
// create settings. Imported by both the client component (LinkedInWorkspace) and the
// server-only save helper (preferences.server.ts), so this file must NOT import any
// server-only code (no createServiceClient, env, fs, etc.).

import { POST_TYPES } from '@/lib/linkedin/postTypes'
import type {
  LinkedInGenerationRequest,
  SourceIntent,
  NarrativeStyle,
  VoiceRegister,
  LinkedInAudience,
  LinkedInLength,
} from '@/lib/linkedin/types'

// One key list governs BOTH the write path (preferences.server.ts) and the read path
// (sanitizeLinkedInLastSettings) so the persisted shape can't drift between them.
// NOTE: `imageDirection` is deliberately excluded — it is a per-post art brief, not a
// reusable strategy default (same rationale as sourceContent/sourceType/sourceUrl). It is
// captured per-output as generation metadata on the visual asset, not restored on reload.
export const LINKEDIN_LAST_SETTINGS_KEYS = [
  'postType',
  'intent',
  'audience',
  'customAudience',
  'narrativeStyle',
  'voiceRegister',
  'length',
  'lensIds',
] as const

const MAX_CUSTOM_AUDIENCE_LEN = 500

// Allowed enum values. postType reuses the canonical POST_TYPES and keeps only ACTIVE types
// (carousel/poll/video_caption are coming_soon and not selectable) so we never seed a
// disabled post type. POST_TYPES is pure config (lucide-react icons + types), already used
// by the PostTypeSelector client component, so it's safe to import here. The remaining sets
// mirror lib/linkedin/types.ts — those option lists also live inline in StrategyPanel today
// (not exported); a future cleanup could export canonical arrays once and derive both.
const ACTIVE_POST_TYPES = new Set(
  POST_TYPES.filter((p) => p.status === 'active').map((p) => p.id),
)
const INTENTS = new Set<SourceIntent>([
  'build_authority', 'drive_discussion', 'generate_leads', 'recruit',
  'launch', 'signal_expertise', 'build_affinity', 'increase_visibility',
])
const AUDIENCES = new Set<LinkedInAudience>([
  'founders', 'enterprise_buyers', 'marketers', 'operators', 'engineers',
  'investors', 'recruiters', 'general_audience', 'custom',
])
const NARRATIVES = new Set<NarrativeStyle>([
  'story', 'debate', 'tactical', 'observational', 'visionary', 'contrarian',
])
const VOICES = new Set<VoiceRegister>([
  'executive', 'warm', 'technical', 'sharp', 'reserved', 'energetic', 'editorial',
])
const LENGTHS = new Set<LinkedInLength>([
  'short', 'medium', 'long', 'executive_brief', 'story_format',
])

// Defaults lifted out of LinkedInWorkspace so the hard-coded list lives in one place.
// No postType default — it stays unselected for first-time brands (matches prior behavior)
// and is only restored from a previously-saved value via initialSettings.
export const DEFAULT_LINKEDIN_CREATE_SETTINGS = {
  length: 'medium',
  audience: 'general_audience',
  lensIds: [],
  narrativeStyle: 'story',
  voiceRegister: 'warm',
  sourceType: 'text',
} satisfies Partial<LinkedInGenerationRequest>

// All eight fields exist on LinkedInGenerationRequest (customAudience is the only optional
// one). Pick preserves optionality; callers use Partial since any field may be absent.
export type LinkedInLastSettings = Pick<
  LinkedInGenerationRequest,
  | 'postType'
  | 'intent'
  | 'audience'
  | 'customAudience'
  | 'narrativeStyle'
  | 'voiceRegister'
  | 'length'
  | 'lensIds'
>

function cleanCustomAudience(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, MAX_CUSTOM_AUDIENCE_LEN)
  return trimmed || undefined
}

/**
 * Pick only the persistable keys from a (partial) request and normalize them for storage.
 * Used on the write path — drops undefined, enforces lensIds-is-string-array, and cleans
 * customAudience. Does NOT validate against the workspace's live lenses (the read path does
 * that). The result is what gets written to workspaces.linkedin_last_create_settings.
 */
export function pickLinkedInLastSettings(
  request: Partial<LinkedInGenerationRequest>,
): Partial<LinkedInLastSettings> {
  const out: Partial<LinkedInLastSettings> = {}
  for (const key of LINKEDIN_LAST_SETTINGS_KEYS) {
    const value = request[key]
    if (value === undefined) continue
    if (key === 'lensIds') {
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        out.lensIds = value as string[]
      }
    } else if (key === 'customAudience') {
      const cleaned = cleanCustomAudience(value)
      if (cleaned) out.customAudience = cleaned
    } else {
      // postType/intent/audience/narrativeStyle/voiceRegister/length — store as-is; the
      // read sanitizer is the final authority on validity.
      out[key] = value as never
    }
  }
  return out
}

/**
 * Read-path guard for the jsonb blob (which has no TS protection once in the DB). Drops
 * unknown keys, validates every enum field against its allowed set, filters lensIds to the
 * workspace's currently-available lenses, and cleans customAudience. Anything invalid is
 * dropped so the caller's defaults apply.
 */
export function sanitizeLinkedInLastSettings(
  raw: unknown,
  availableLensIds: string[],
): Partial<LinkedInLastSettings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const input = raw as Record<string, unknown>
  const out: Partial<LinkedInLastSettings> = {}

  if (ACTIVE_POST_TYPES.has(input.postType as never)) {
    out.postType = input.postType as LinkedInLastSettings['postType']
  }
  if (INTENTS.has(input.intent as SourceIntent)) {
    out.intent = input.intent as SourceIntent
  }
  if (AUDIENCES.has(input.audience as LinkedInAudience)) {
    out.audience = input.audience as LinkedInAudience
  }
  if (NARRATIVES.has(input.narrativeStyle as NarrativeStyle)) {
    out.narrativeStyle = input.narrativeStyle as NarrativeStyle
  }
  if (VOICES.has(input.voiceRegister as VoiceRegister)) {
    out.voiceRegister = input.voiceRegister as VoiceRegister
  }
  if (LENGTHS.has(input.length as LinkedInLength)) {
    out.length = input.length as LinkedInLength
  }

  if (Array.isArray(input.lensIds)) {
    const allowed = new Set(availableLensIds)
    out.lensIds = input.lensIds.filter(
      (id): id is string => typeof id === 'string' && allowed.has(id),
    )
  }

  const customAudience = cleanCustomAudience(input.customAudience)
  if (customAudience) out.customAudience = customAudience

  return out
}
