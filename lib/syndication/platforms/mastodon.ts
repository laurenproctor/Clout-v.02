export const MASTODON_PLATFORM_MODEL = {
  platform: 'mastodon' as const,

  rhetoricalEnvironment: `Mastodon is a federated, text-first network with a chronological feed and no algorithmic amplification. The community values authenticity, substance, and mutual respect over reach optimization. Posts succeed on the strength of their ideas, not their hook mechanics. Hashtags are genuinely useful for discovery — the federated timeline uses them as primary navigation. Growth hacking, self-promotion without contribution, and corporate-sounding content are actively unwelcome. The reader is sophisticated and skeptical of anything that feels manufactured. Content warnings are a cultural norm for certain topics; always be mindful of the community's values around sensitive content.`,

  preWritingFramework: `Before writing, complete this analysis:

1. **The one useful idea** — What specific, non-obvious thing does this source contain that a Mastodon reader would genuinely value? Not a summary. The one thing worth saying.

2. **Community framing** — How does this idea connect to something the Mastodon community cares about? Technology, open source, privacy, local/independent media, social justice, science, arts? Write for a specific subculture, not a generic audience.

3. **Hashtag audit** — What are the 1–4 hashtags that would put this in front of the right readers? Use CamelCase for readability (e.g., #OpenSource, #DigitalRights). No hashtag spam.

4. **500-character check** — Can you say this in 500 characters? If not, compress until you can.

Only write the post after completing this analysis.`,

  structuralRules: [
    'Hard limit: 500 characters — every character must earn its place',
    'No algorithmic feed — write for the chronological reader who will see this once',
    'Say one specific thing clearly; do not pad with context the reader does not need',
    'Use 1–4 relevant hashtags in CamelCase — they are real discovery tools here',
    'Write as a person with a point of view, not as a content marketer',
    'Links are first-class — include when the source adds genuine value',
    'Front-load the idea — you have no hook mechanics, only words',
    'Respect the Content Warning culture — flag appropriately if touching sensitive topics',
  ],

  lengthTarget: 'Maximum 500 characters. Target 470 to leave margin for edge cases. A tight 350-character post is better than a padded 499-character one. Single post only — no threading.',

  antiPatterns: [
    'Growth hacking openers — "You need to know this", "Thread:", "Hot take:"',
    'Corporate or brand voice — no "leveraging synergies", "exciting news", "we are thrilled"',
    'Hashtag stacking at the end — place hashtags naturally within the text or use 1–2 at the end',
    'Vague inspiration — "Be the change" or "Consistency is everything" — say something specific',
    'Audience-bait engagement prompts — "What do you think?", "Reply with your answer"',
    'Content that feels like a press release or blog teaser',
    'AI-sounding phrasing — "In today\'s world", "It\'s important to note", "Key takeaways"',
    'Going over 500 characters under any circumstances',
  ],
}
