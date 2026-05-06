export const BLOG_PLATFORM_MODEL = {
  platform: 'blog' as const,
  rhetoricalEnvironment: `Blog content lives in search and reference contexts. Readers arrive from Google or direct links seeking explanations, frameworks, or authoritative takes on a specific topic. They are less likely to have prior relationship with the author.

The dominant expectations are: clear structure, scannable hierarchy, and durable utility. Content that remains correct and useful 12 months after publication is ideal.`,
  structuralRules: [
    'Open with a title that is specific and searchable; subtitles should clarify rather than tease',
    'Use a clear introduction that states the topic and the reader\'s takeaway',
    'Structure with H2/H3 headings that allow scanning — readers will not read linearly',
    'Each section should be self-contained: a reader who enters mid-article should be able to orient quickly',
    'Conclude with a practical summary or actionable synthesis',
  ],
  lengthTarget: '500–1200 words with clear section structure',
  antiPatterns: [
    'Do not write a title that could apply to any post on the topic ("Thoughts on X")',
    'Do not open without clearly identifying what the post is about',
    'Do not use cliffhangers or withhold the core insight until the end',
    'Do not write dense, unbroken paragraphs without visual relief',
    'Do not use tone that is so casual it undermines authority or so formal it reduces utility',
  ],
}
