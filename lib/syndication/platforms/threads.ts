import type { PlatformBehaviorModel } from '../types/platform'

export const THREADS_PLATFORM_MODEL: PlatformBehaviorModel = {
  platform: 'threads',

  rhetoricalEnvironment: `Threads is a low-polish, reply-first social space. Users scroll like Instagram but write like they're texting a group chat. The dominant register is personal observation — not broadcast, not announcement, not thought leadership.

Posts under 200 characters consistently outperform longer ones. Strong opening lines matter. Hashtags are largely decorative and often read as corporate. The emotional register that wins: specific, slightly unfinished, quietly interesting. Being right matters less than being interesting.

The reader isn't waiting for your take. They're mid-scroll. The post either earns their pause in the first sentence or it doesn't.`,

  preWritingFramework: `Before writing, identify:

1. The single observation this post is making — not the topic, but the observation. ("AI is changing work" is a topic. "Most AI tools just make people more efficient at the wrong things" is an observation.)

2. Why a stranger would find this interesting right now. Not "it's important" — why specifically, right now, to this person.

3. What natural reply it invites. A good Threads post ends with a door slightly open. Not a question, not a CTA — just an ending that makes the reader want to say something.

4. Whether it sounds like something a person said or something a brand published. If you'd see it in a press release, rewrite it.

5. Whether the ending creates forward tension or closes everything down. Closure is fine. Premature closure — explaining the point — kills the post.`,

  structuralRules: [
    'Lead with a single observation, not a headline or announcement',
    'One idea per post — the urge to explain is usually the impulse to kill the post',
    'Short paragraphs: 1–2 sentences maximum. Whitespace carries pacing.',
    'Write in first person. Not "brands," not "leaders," not the royal "we"',
    'Let whitespace do editorial work — a blank line says more than a transition phrase',
    'End on open tension, a question, or an unresolved thought — not a CTA',
    'If threading, each reply must be independently readable by someone who arrives mid-thread',
    'Avoid numbered lists and bullet formatting — use flowing prose instead',
    'The post should feel like something a person said to a friend, not something a team approved',
  ],

  lengthTarget: 'Under 200 characters for single posts (hard max 500). Thread sequences: 2–10 posts. Err toward shorter. A tighter post is almost always better.',

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
    supportsThreads: true,
    supportsMedia: true,
    supportsCarousel: false,
    supportsPolls: false,
    supportsScheduling: false,
    maxPostLength: 500,
    softPostLength: 200,
    maxThreadLength: 10,
  },
}
