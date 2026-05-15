import type { PlatformBehaviorModel } from '../types/platform'

export const MEDIUM_PLATFORM_MODEL: PlatformBehaviorModel = {
  platform: 'medium' as PlatformBehaviorModel['platform'],

  rhetoricalEnvironment: `Medium is a reading-first editorial space. The reader came to read — not to scroll, not to scan, not to network. They have opted into depth. This changes everything.

The dominant register is considered personal essay, reported analysis, or structured technical argument. Voice matters more than platform conventions. Authority comes from precision and earned insight, not credential-dropping. The format is long-form prose, not bullet scaffolding.

Posts that perform well on Medium share one trait: they have a clear thesis the reader could articulate after finishing. Not a topic — a claim. Not a summary — a perspective the piece earns.

Opening sentences carry disproportionate weight. Medium readers decide within two sentences whether the piece deserves their attention. The opening must establish an intellectual premise, not warm up or introduce the author.

Section headers should be informative and structural, not teaser-clickbait. The reader is already inside the piece. Headers orient — they do not sell.

The closing must land. Medium readers who reach the end should feel the piece's argument complete — not summarized, but resolved. The last paragraph is the residue that stays.`,

  preWritingFramework: `Before writing, work through these questions:

1. The thesis — not the topic, not the subject, but the claim. "Remote work is popular" is a topic. "Remote work has made bad management invisible until it explodes" is a thesis. If you cannot state it in one sentence, the piece is not ready.

2. The earned insight — what observation, experience, or data does this piece rest on that the reader doesn't already have? If there is no earned insight, it's an opinion piece. Opinion pieces are fine, but they need to say something the reader hasn't thought.

3. The arc — where does the reader start, what shift happens in the middle, where do they land? Medium pieces that feel complete have a movement. The reader's understanding is different at the end than at the start.

4. Who is reading this — specifically. Not "thoughtful professionals." What kind of person with what prior knowledge and what skepticism. The piece should feel written for that person, not a broadcast to everyone.

5. What the first sentence does — not what it says, but what it does. Does it open a question? Establish tension? Offer a provocation? Describe a scene? The first sentence establishes the register for the entire piece.`,

  structuralRules: [
    'Every piece needs a thesis — a claim the piece is built to earn, not just a topic it covers',
    'Open with a premise or tension, not a preamble or self-introduction',
    'Use section headers to orient, not to tease — headers should tell the reader where they are, not sell the next section',
    'Paragraphs should develop one idea — when a paragraph tries to hold two, break it',
    'Transitions between sections should advance the argument, not recap what just happened',
    'Avoid numbered and bulleted lists as the primary structure — use them for genuinely list-shaped content only',
    'Write in first person or close third — never the institutional we or the passive voice of authority',
    'The closing must resolve the thesis — not summarize, not call to action, not add a new idea',
    'Quotations should be the minimum needed to make the point — do not quote to avoid saying the thing yourself',
    'Footnotes and asides live in parenthetical prose — Medium has no footnote support',
  ],

  lengthTarget: 'Target 800–2000 words for standard pieces. Deep technical or reported pieces can run longer — length is justified by argument, not padding. Every paragraph should be load-bearing.',

  antiPatterns: [
    '"In this article, I will..." or any variation of announcing what the piece will do instead of doing it',
    '"As a [title/credential]..." authority openers',
    'Bullet lists as a substitute for prose argument',
    'Section headers that tease rather than orient: "Why This Matters," "The Key Insight," "What Comes Next"',
    '"The truth is..." or "Here\'s the thing..." as thought-leadership transitions',
    '"Game-changing," "revolutionary," "disrupting," "transforming"',
    'Summarizing conclusions the reader just read: "So, as we\'ve seen..."',
    '"In today\'s world," "In this day and age," "In the current landscape"',
    'CTA endings: "Follow me for more," "Clap if you found this useful," "Subscribe below"',
    '"I hope this helps" or any variant of performance-of-modesty closings',
    'Excessive subheadings that break a 300-word section into 4 fragments',
    '"This is part one of a series" without the series existing',
    'Passive-voice authority: "It has been found that," "Research suggests," "Studies show"',
    'Starting multiple consecutive paragraphs with "I"',
  ],

  behaviorSignals: {
    emotionalAuthenticityWeight: 'high',
    ctaResistance: 'high',
    authorityTolerance: 'high',
    polishPenalty: 'low',
    interruptionTolerance: 'low',
    ambiguityTolerance: 'medium',
    explainabilityExpectation: 'high',
    listTolerance: 'low',
  },

  capabilities: {
    supportsThreads: false,
    supportsMedia: true,
    supportsCarousel: false,
    supportsPolls: false,
    supportsScheduling: false,
    maxPostLength: 100000,
  },
}
