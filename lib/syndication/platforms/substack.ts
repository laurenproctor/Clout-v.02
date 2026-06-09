export type SubstackArticleLength = 'short' | 'standard' | 'long'
export type SubstackArticleType   = 'essay' | 'analysis' | 'commentary' | 'explainer'

export const SUBSTACK_LENGTH_TARGETS: Record<SubstackArticleLength, { label: string; words: string }> = {
  short:    { label: 'Short',    words: '400–600 words'  },
  standard: { label: 'Standard', words: '600–900 words'  },
  long:     { label: 'Long',     words: '900–1400 words' },
}

export const SUBSTACK_ARTICLE_TYPES: Record<SubstackArticleType, { label: string; description: string }> = {
  essay:       { label: 'Essay',       description: 'Developed argument with a clear thesis and narrative arc' },
  analysis:    { label: 'Analysis',    description: 'Evidence-driven breakdown of a topic, trend, or event' },
  commentary:  { label: 'Commentary',  description: 'Opinionated response to news, ideas, or cultural moments' },
  explainer:   { label: 'Explainer',   description: 'Accessible deep-dive that builds understanding from first principles' },
}

export const SUBSTACK_PLATFORM_MODEL = {
  platform: 'substack' as const,
  rhetoricalEnvironment: `Substack is a long-form, subscription-native environment where readers arrive with deliberate attention and expect immersive prose. The dominant expectation is a writer with a developed worldview engaging seriously with an idea.

Readers tolerate — and reward — complexity, digression, and pacing variation when they serve the argument. Substack readers have opted into the relationship; they expect depth in return.`,
  structuralRules: [
    'Open with a scene, question, or observation that earns the reader\'s trust before the thesis arrives',
    'Allow the argument to develop through layering — introduce tension, develop it, resolve it with nuance',
    'Pacing can vary: fast sections earn slow sections',
    'Key quotes and specific details from the source should survive the adaptation — they are load-bearing',
    'End with a closing that elevates the argument to its most resonant abstraction, not a practical list',
  ],
  lengthTarget: '400–900 words',
  antiPatterns: [
    'Do not compress ideas that require space to land',
    'Do not adopt the punchy line-break cadence of X or LinkedIn',
    'Do not list conclusions — develop them',
    'Do not explain what you are about to argue before arguing it',
    'Do not use SEO-style headers ("What Is X", "Why X Matters")',
  ],
}
