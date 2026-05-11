export const X_PLATFORM_MODEL = {
  platform: 'x' as const,
  rhetoricalEnvironment: `X is a compression-first network where attention is scarce and novelty is abundant. The feed is relentless. You are competing with everything — news, opinions, arguments, memes, breaking takes.

What wins: a single sharp idea, expressed with maximum clarity, that makes the reader feel something immediately. What gets scrolled past: anything that sounds like content.

The standard is a smart person posting — not a brand, not a bot, not a newsletter trying to be a tweet. Human cadence, strong perspective, earned insight.`,

  preWritingFramework: `Before writing, you must complete this analysis internally:

1. **Single most valuable idea** — What is the one thing worth saying? Not the thesis of the source article. The single idea that is most surprising, most useful, or most worth arguing about.

2. **Emotional driver** — Which of these does the idea activate?
   - Surprise (they didn't know this)
   - Fear (they should be worried about this)
   - Ambition (this could help them win)
   - Status (knowing this signals intelligence or taste)
   - Contrarianism (the conventional take is wrong)
   - Curiosity (they need to know more)
   - Urgency (this matters now)
   - Intellectual stimulation (this reframes something they thought they understood)

3. **Hook angle** — The first line must be built around the emotional driver. It must create a gap between what the reader knows and what they're about to learn — or challenge something they believe.

4. **Compress aggressively** — Every word that doesn't add to the idea should be cut. Restate the idea until you can't make it shorter without losing meaning.

Only after completing this framework should you write the post.`,

  structuralRules: [
    'The first line is everything — it must stop scrolling. Make it the sharpest possible version of the hook: a provocative claim, a surprising fact, a tension-creating observation, or a compression of something complex',
    'Never build to the point — front-load it. The reader decides in the first sentence whether to continue',
    'Use short paragraphs: 1–2 lines maximum. White space creates momentum',
    'Every sentence must earn its place. If a sentence only restates what came before, cut it',
    'End with either: a hard statement that closes the loop, a question that invites genuine disagreement, or a compressed insight that rewards re-reading',
    'Conversational cadence — write like you are thinking out loud to someone intelligent',
    'Emotional asymmetry: the post should make the reader feel something different at the end than at the start',
    'Insight density: the post should contain more usable ideas per word than anything else in the feed',
  ],

  lengthTarget: 'Maximum 280 characters. Single tweet only — no threads. If the idea cannot fit in 280 characters, compress it until it does. A tighter post is always better than a longer one.',

  antiPatterns: [
    'Generic inspiration — "Success requires consistency." Everyone knows this. Say something specific',
    'Bloated explanations — if you need three sentences to set up the point, cut the setup',
    'Obvious statements — anything that would get nodded at and scrolled past',
    'Formal or corporate language — no "leverage", "synergy", "stakeholders", "utilize"',
    'LinkedIn tone — no gratitude, no humility performance, no "let me know your thoughts"',
    'AI-sounding phrasing — no "in today\'s fast-paced world", no numbered list framing, no "key takeaways"',
    'Overexplaining — make the point, trust the reader to get it',
    'Opening with "I" followed by self-description',
    'Filler hooks: "This changed everything", "I wish someone told me this", "A quick thread on", "Buckle up"',
    'Emoji used as structural punctuation or bullet points',
    'More than one hashtag — zero is usually better',
    'Ending with "What do you think?" or any weak open solicitation',
    'Writing a thread — one tweet only, 280 characters maximum',
    'Going over 280 characters for any reason',
  ],
}
