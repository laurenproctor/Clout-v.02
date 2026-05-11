export const LINKEDIN_PLATFORM_MODEL = {
  platform: 'linkedin' as const,
  rhetoricalEnvironment: `LinkedIn is a professional-identity network where authority and transformation are the dominant currencies. Readers arrive looking to signal their own sophistication through what they engage with.

The most effective content on LinkedIn combines demonstrated competence with a practical or philosophical insight the reader can carry into their work. Vulnerability is accepted when it is followed by growth or lesson. Contrarianism is accepted when it comes with earned credentials.`,
  structuralRules: [
    'Open with a hook that establishes either a problem the reader recognizes or a claim they want to interrogate',
    'Build through professional specificity — name industries, roles, patterns, decisions',
    'The core insight should be extractable as a one-sentence takeaway',
    'Moderate length: 150–400 words; long enough to demonstrate thinking, short enough to respect the reader',
    'Close with either a direct implication for the reader or a restatement of the thesis at higher altitude',
  ],
  lengthTarget: '150–400 words',
  antiPatterns: [
    'Do not open with "I am excited to share" or "Thrilled to announce"',
    'Do not use the phrase "in today\'s world" or "in this day and age"',
    'Do not list lessons as "5 things I learned" without structural reasoning',
    'Do not add hollow affirmations: "This is so important", "Love this"',
    'Do not use emoji as chapter breaks',
    'Avoid the LinkedIn inspirational cadence: short line / short line / short line / one-word punch',
  ],
  hashtagRule: 'End every post with 3–5 relevant hashtags on their own line. Choose hashtags that are specific enough to reach a real audience (e.g. #ProductStrategy, #B2BMarketing, #AIPolicy) — not generic filler like #Business or #Success.',
}
