export type PresetLensName =
  | 'Contrarian'
  | 'Founder'
  | 'Intellectual'
  | 'Technical'
  | 'Emotional'
  | 'Operator'
  | 'Luxury'
  | 'Investor'

export interface PresetLens {
  name: PresetLensName
  description: string
  rhetoricalModifier: string
}

export const PRESET_LENSES: PresetLens[] = [
  {
    name: 'Contrarian',
    description: 'Challenges conventional wisdom, surfaces the counter-intuitive angle',
    rhetoricalModifier: 'Challenge the dominant assumption. Find the inversion. Make the reader reconsider what they took for granted.',
  },
  {
    name: 'Founder',
    description: 'Frames through operational experience and product thinking',
    rhetoricalModifier: 'Write from the perspective of someone who has built things and lived with the consequences. Specific, operational, earned.',
  },
  {
    name: 'Intellectual',
    description: 'Elevates the argument to a conceptual or philosophical register',
    rhetoricalModifier: 'Raise the level of abstraction. Find the underlying principle. Connect to broader systems of ideas.',
  },
  {
    name: 'Technical',
    description: 'Grounds claims in mechanism and precision',
    rhetoricalModifier: 'Favor precision over polish. Explain the mechanism. Name the components. Reward technical readers.',
  },
  {
    name: 'Emotional',
    description: 'Leads with felt experience and human stakes',
    rhetoricalModifier: 'Lead with the human stakes. Make the reader feel the weight before explaining the structure.',
  },
  {
    name: 'Operator',
    description: 'Prioritizes execution clarity and practical decision-making',
    rhetoricalModifier: 'Write for someone who needs to act on this. Practical, direct, clear about what to do and why.',
  },
  {
    name: 'Luxury',
    description: 'Signals exclusivity, taste, and high-stakes positioning',
    rhetoricalModifier: 'Write with restraint and precision. Signal through what is left unsaid. Quality over quantity in every sentence.',
  },
  {
    name: 'Investor',
    description: 'Frames through return, risk, and capital allocation thinking',
    rhetoricalModifier: 'Frame through leverage, asymmetry, and long-term compounding. Think in bets, not tasks.',
  },
]

export interface SyndicationLens {
  id: string             // preset lens name OR workspace lens UUID
  name: string
  rhetoricalModifier: string
  isPreset: boolean
}

export type LensCategoryName = 'Interpretation' | 'Narrative' | 'Positioning'

export interface LensCategory {
  name: LensCategoryName
  lensNames: PresetLensName[]
}

export const LENS_CATEGORIES: LensCategory[] = [
  { name: 'Interpretation', lensNames: ['Contrarian', 'Intellectual', 'Technical'] },
  { name: 'Narrative',      lensNames: ['Emotional', 'Luxury'] },
  { name: 'Positioning',    lensNames: ['Founder', 'Operator', 'Investor'] },
]
