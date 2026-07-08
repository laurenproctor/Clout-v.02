// Shared types + option taxonomies for the universal "Start from anything" create flow.
// Safe to import from both client components and server code (no server-only deps).

/** The seven primary formats a universal brief can be routed to. */
export type RecommendedFormat =
  | 'linkedin'
  | 'blog'
  | 'threads'
  | 'instagram'
  | 'image'
  | 'note'
  | 'substack_email'

/** A downstream channel the primary draft could be adapted into, and its editorial role. */
export interface SuggestedAdaptation {
  channel: string
  role: string
}

/** The intake tab a brief originated from. */
export type UniversalInputType = 'topic' | 'write' | 'paste' | 'link' | 'voice' | 'upload'

/** Request payload for the recommendation endpoint. */
export interface RecommendContentInput {
  inputType: UniversalInputType
  rawInput: string
  brandLensId?: string | null
  angle?: string | null
  goal?: string | null
  /** User-chosen starting point; 'auto' means "Let Clout choose". */
  startingPoint?: RecommendedFormat | 'auto' | null
  /** The Capture that holds this brief; the recommendation is persisted against it. */
  captureId?: string | null
}

/** The model's recommendation result. */
export interface RecommendationResult {
  recommendedPrimaryFormat: RecommendedFormat
  rationale: string
  suggestedAdaptations: SuggestedAdaptation[]
  normalizedInput: string
  title: string
}

/** The recommendation as persisted against a Capture (result + the inputs that produced it). */
export interface StoredCreateRecommendation extends RecommendationResult {
  brandLensId: string | null
  angle: string | null
  goal: string | null
  startingPoint: RecommendedFormat | 'auto'
  createdAt: string
}

/** Angle options (generic creative framing — distinct from workspace brand lenses). */
export const ANGLE_OPTIONS = [
  'Authority',
  'Contrarian',
  'Founder lesson',
  'Trend',
  'Framework',
  'Personal story',
  'How-to',
  'Opinion',
] as const

/** Goal options — the strategic outcome the piece should drive. */
export const GOAL_OPTIONS = [
  'Build authority',
  'Explain a shift',
  'Announce something',
  'Drive clicks',
  'Start conversation',
] as const

/** Starting-point options, mapping user-facing labels to the format enum. */
export const STARTING_POINT_OPTIONS: Array<{ value: RecommendedFormat | 'auto'; label: string }> = [
  { value: 'auto', label: 'Let Clout choose' },
  { value: 'linkedin', label: 'LinkedIn post' },
  { value: 'blog', label: 'Blog post' },
  { value: 'threads', label: 'Threads post' },
  { value: 'instagram', label: 'Instagram post' },
  { value: 'image', label: 'Image' },
  { value: 'note', label: 'Substack note' },
  { value: 'substack_email', label: 'Substack email' },
]

/** Human-friendly label for a format. */
export const FORMAT_LABELS: Record<RecommendedFormat, string> = {
  linkedin: 'LinkedIn post',
  blog: 'Blog post',
  threads: 'Threads post',
  instagram: 'Instagram post',
  image: 'Image',
  note: 'Substack note',
  substack_email: 'Substack email',
}

/** Relative creator route (under /{workspaceSlug}) for each format. */
export const FORMAT_CREATOR_ROUTE: Record<RecommendedFormat, string> = {
  linkedin: '/create/linkedin',
  blog: '/create/blog',
  threads: '/create/threads',
  instagram: '/create/instagram',
  image: '/create/image',
  note: '/create/note',
  substack_email: '/create/substack-email',
}

export const RECOMMENDED_FORMATS = Object.keys(FORMAT_LABELS) as RecommendedFormat[]

export function isRecommendedFormat(v: unknown): v is RecommendedFormat {
  return typeof v === 'string' && v in FORMAT_LABELS
}
