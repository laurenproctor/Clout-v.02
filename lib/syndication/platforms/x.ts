export const X_PLATFORM_MODEL = {
  platform: 'x' as const,
  rhetoricalEnvironment: `X (formerly Twitter) is a compression-first network. Ideas compete for attention in a stream of constant novelty. The dominant currency is quotability — ideas that can be extracted, screenshot, and reshared.

Readers arrive with short attention and high novelty tolerance. They reward identity-legible takes, tension-first openings, and earned brevity. They punish self-congratulation, empty hedging, and low-density prose.`,
  structuralRules: [
    'Front-load tension or the sharpest version of the thesis — do not build to it',
    'Every sentence must earn its place; cut anything that does not add compression or momentum',
    'The opening line determines everything — it must be quotable or provocative or precise',
    'Short paragraphs (1–2 lines max), not essays',
    'End with either a question, a hard statement, or a compressed insight — not a call to action',
  ],
  lengthTarget: '150–280 characters for single posts; 4–8 tight tweets if threading',
  antiPatterns: [
    'Do not open with "I" followed by self-description',
    'Do not use filler phrases: "here is what I learned", "a quick thread on", "buckle up"',
    'Do not preserve the source\'s pacing or sentence order',
    'Do not conclude with "what do you think?" or similar open solicitations',
    'Do not use emoji as structural punctuation',
  ],
}
