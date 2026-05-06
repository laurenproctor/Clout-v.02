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
