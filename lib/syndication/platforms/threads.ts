import type { PlatformBehaviorModel } from '../types/platform'

export const THREADS_PLATFORM_MODEL: PlatformBehaviorModel = {
  platform: 'threads',

  rhetoricalEnvironment: `Threads is a low-polish, reply-first social space. The dominant register is personal observation — not broadcast, not announcement, not thought leadership.

Posts under 200 characters consistently outperform longer ones. Strong opening lines matter. Hashtags are largely decorative and often read as corporate. The emotional register that wins: specific, quietly interesting, confident without being loud. Being right matters less than being interesting.

The reader isn't waiting for your take. They're mid-scroll. The post either earns their pause in the first sentence or it doesn't.

"Low-polish" means the tone is direct and personal, not that grammar and punctuation are optional. Every post must use correct grammar, complete sentences, and proper punctuation. Casualness lives in word choice and sentence rhythm — not in dropped periods or careless syntax.`,

  preWritingFramework: `Before writing, work through these questions:

1. The single observation this post is making — not the topic, but the observation. ("AI is changing work" is a topic. "Most AI tools just make people more efficient at the wrong things" is an observation.)

2. Why a stranger would find this interesting right now. Not "it's important" — why specifically, right now, to this person.

3. What natural reply it invites. A good Threads post ends with a door slightly open. Not a question, not a CTA — just an ending that makes the reader want to say something.

4. Whether it sounds like something a person said or something a brand published. If you'd see it in a press release, rewrite it.

5. Whether the ending creates forward tension or closes everything down. Closure is fine. Premature closure — explaining the point — kills the post.

**Before finalizing, ask yourself:**
- Does this sound like a real intelligent person wrote it?
- Is every sentence grammatically correct with proper punctuation?
- Would someone naturally reply to this?
- Does the pacing feel human?
- Is any post unnecessary? Cut it.
- Does it feel complete as a single post?`,

  structuralRules: [
    'Use correct grammar, complete sentences, and proper punctuation in every post — casual tone does not mean loose writing',
    'Lead with a single observation, not a headline or announcement',
    'One idea per post — the urge to explain is usually the impulse to kill the post',
    'Each post should contain 1–4 sentences and feel complete on its own',
    'Write in first person. Not "brands," not "leaders," not the royal "we"',
    'Let whitespace do editorial work — a blank line says more than a transition phrase',
    'End on open tension, a question, or an unresolved thought — not a CTA',
    'Avoid numbered lists and bullet formatting — use flowing prose instead',
    'The post should feel like something a person said to a friend, not something a team approved',
  ],

  lengthTarget: 'Aim for 1–4 sentences (hard max 500 characters). Prefer medium-density — complete, readable, at least one meaningful observation. No ultra-short filler, no giant essay blocks.',

  antiPatterns: [
    '"Thrilled to announce" or any variation of excited-to-share language',
    '"Game-changing" or "revolutionary" or "groundbreaking"',
    '"As a [title/role]" openers',
    '"Here are X things/tips/ways" list formats',
    '"Thread 🧵" opener',
    'Em dash chains mid-sentence — they signal over-polished drafting',
    'Bullet points or numbered lists',
    'Excessive emoji — one is often fine, three is a wall',
    'Generic CTAs: "link in bio," "subscribe below," "check it out," "learn more"',
    'Over-polished openers with complex subordinate clauses',
    '"Thought leadership" vocabulary: "leverage," "synergy," "unlock," "empower," "impact"',
    'Corporate passive voice: "it has been observed that," "it is important to note"',
    '"In today\'s world," "In this day and age," "In the current landscape"',
    'Question-as-hook clichés: "Have you ever wondered…", "What if I told you…"',
    '"Let that sink in." or "Just think about that."',
    '"The future of X is here."',
    'Explaining the point after already making it',
    'Dropping terminal punctuation or writing in all lowercase as a stylistic choice',
    'Sentence fragments used as standalone posts',
  ],

  hashtagRule: 'Use 0–1 hashtags maximum. Only include one if it meaningfully places the post in a real discovery category. Most posts are better without any. Hashtags on Threads often read as corporate.',

  behaviorSignals: {
    emotionalAuthenticityWeight: 'high',
    ctaResistance: 'high',
    authorityTolerance: 'low',
    polishPenalty: 'high',
    interruptionTolerance: 'high',
    ambiguityTolerance: 'high',
    explainabilityExpectation: 'low',
    listTolerance: 'low',
  },

  capabilities: {
    supportsThreads: false,
    supportsMedia: true,
    supportsCarousel: false,
    supportsPolls: false,
    supportsScheduling: false,
    maxPostLength: 500,
    softPostLength: 200,
  },
}
