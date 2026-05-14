import type { PlatformBehaviorModel } from '../types/platform'

export const GBP_PLATFORM_MODEL: PlatformBehaviorModel = {
  platform: 'google_business_profile',

  rhetoricalEnvironment: `Google Business Profile posts appear in local search results and on Google Maps to people actively looking for this type of business. The reader is in discovery or evaluation mode — not browsing a social feed. They want operational clarity: what does this business do, why should I trust it, is it relevant to me right now.

The context is transactional intent. Someone searched for a plumber, a restaurant, a therapist, a law firm. They found this listing. The post either gives them a reason to engage or it doesn't. There is no algorithmic boost for shares or engagement bait. There is no audience relationship being built.

Credibility is everything. Specificity beats abstraction. Operational clarity beats inspiration. Polish is a liability — it reads as marketing copy rather than a real business communicating directly. A post about what the business actually does today, this week, for this kind of customer, will always outperform thought leadership.

Write like a credible local business communicating directly with customers discovering the business through search. Every word should serve the reader who is deciding whether to contact this business.`,

  preWritingFramework: `Before writing, work through these questions:

1. What operational fact or update makes this post useful to someone discovering this business right now? Not a brand message — a fact. (Hours change, a new service, an event, a specific outcome for a customer type.)

2. Is there a local or community relevance angle? (Serving this neighborhood, available for this city's residents, relevant to this season or local event.)

3. What would a customer actually want to know at this moment? Not what the business wants to say — what the customer needs to decide.

4. What's the simplest, most direct way to say it? Strip everything that sounds like marketing copy.

Strip: thought leadership, abstract positioning, engagement bait, social media hooks, viral framing.`,

  structuralRules: [
    'Lead with the operational fact or specific value — not a hook, not a question, not a headline',
    'Use plain language a customer would recognize immediately — no jargon, no brand vocabulary',
    'Include a clear action or direction when relevant (call, book, visit, ask about X)',
    'Keep sentences short — scanning behavior is dominant in search context',
    'Specific details outperform general claims: hours, prices, outcomes, locations, names, timelines',
    'One idea per post — no threading, no multi-part content',
    'Correct grammar and complete sentences always — informality lives in word choice, not syntax',
  ],

  lengthTarget: '100–500 characters optimal; 1500 character hard limit. Shorter is almost always better for transactional intent. Longer posts are appropriate for service businesses, healthcare, and industrial contexts where the customer needs more to make a decision.',

  antiPatterns: [
    'Abstract founder philosophy or thought leadership',
    'Twitter-style punchy hooks designed for social virality',
    'Long narrative arcs or storytelling threads',
    'Engagement bait ("Comment below", "Tag someone", "Share if you agree")',
    'Excessive hashtags — 0 is preferred; 1 maximum only if a specific local event tag is directly relevant',
    'Inflated marketing language ("world-class", "transformative", "leading", "game-changing")',
    'Corporate passive voice and brand-speak',
    '"Thrilled to announce" or any variation of announcement language',
    'Questions-as-hooks clichés: "Have you ever wondered…", "What if I told you…"',
    '"In today\'s world" or "In the current landscape" openers',
    'Explaining brand values abstractly rather than demonstrating them operationally',
    'Generic CTAs that don\'t match the business type or post content',
  ],

  hashtagRule: 'Avoid hashtags entirely. They read as social media content in a search context, which undermines local business credibility. Only use one if it is a specific local event hashtag directly relevant to the post.',

  behaviorSignals: {
    emotionalAuthenticityWeight: 'medium',
    ctaResistance: 'low',           // CTAs are expected and appropriate in local search context
    authorityTolerance: 'medium',   // demonstrated competence, not claimed authority
    polishPenalty: 'medium',        // overly polished reads as marketing copy, not a real business
    interruptionTolerance: 'low',   // no disruptive social hooks — user is in search/evaluation mode
    ambiguityTolerance: 'low',      // operational clarity is required; ambiguity costs conversions
    explainabilityExpectation: 'high',
    listTolerance: 'low',           // prefer prose; bullet lists feel like ad copy in this context
  },

  capabilities: {
    supportsThreads: false,
    supportsMedia: true,
    supportsCarousel: false,
    supportsPolls: false,
    supportsScheduling: true,
    maxPostLength: 1500,
    softPostLength: 300,
  },
}
