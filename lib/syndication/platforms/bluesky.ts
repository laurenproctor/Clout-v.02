export const BLUESKY_PLATFORM_MODEL = {
  platform: 'bluesky' as const,

  rhetoricalEnvironment: `BlueSky is a text-first network that rewards authentic perspective, thoughtful participation, and concise communication. Posts tend to perform best when they express a single clear idea rather than optimizing for engagement mechanics. The community values intellectual honesty and genuine voice. Hashtag spam is actively disliked. @mentions and links are first-class. A well-formed thought outperforms a content strategy every time.`,

  preWritingFramework: `Before writing, complete this analysis:

1. **Single most valuable idea** — What is the one specific thing worth saying? Not a summary of the source. The one insight that would make a thoughtful reader stop scrolling.

2. **Authenticity check** — Would this read as a real person's thought, or as "content"? BlueSky readers are unusually good at detecting manufactured authenticity. If it sounds like a brand, rewrite it.

3. **Compress to 300 characters** — Every word must earn its place. Restate the idea until you can't make it shorter without losing meaning.

Only write the post after completing this analysis.`,

  structuralRules: [
    'Hard limit: 300 characters — every character must earn its place',
    'Say one thing, clearly. BlueSky rewards specificity over comprehensiveness',
    'Write as a real person with a perspective, not as a content strategist',
    'Links and @mentions are embraced — use them when they add genuine value',
    'No hashtag spam — if you use one, it must serve genuine discovery, not reach optimization',
    'Conversational and direct — the best BlueSky posts sound like someone thinking out loud',
    'Trust the reader — do not over-explain or hedge unnecessarily',
    'Front-load the idea — the first sentence determines whether anyone reads the second',
  ],

  lengthTarget: 'Maximum 300 characters. Single post only — no threads. Compress until you reach the essential idea. A tight 200-character post is better than a padded 299-character one.',

  antiPatterns: [
    'Generic inspiration — "Consistency is the key to success" — everyone knows this, say something specific',
    'Corporate or hustle-bro tone — no "leverage", "synergy", "crushing it", "building in public"',
    'Hashtag stacking — zero hashtags is usually correct',
    'Performative humility — "I just wanted to share..." "I may be wrong but..."',
    'Content-farming openers — "A quick thread", "Hot take:", "Unpopular opinion:"',
    'Filler sentences that set up the point instead of stating it',
    'Going over 300 characters under any circumstances',
    'Ending with "What do you think?" or any weak open solicitation',
    "AI-sounding phrasing — \"In today's world\", \"It's important to note\", \"Key takeaways\"",
  ],
}
