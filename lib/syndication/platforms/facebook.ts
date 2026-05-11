export const FACEBOOK_PLATFORM_MODEL = {
  platform: 'facebook' as const,

  rhetoricalEnvironment: `Facebook is a personal-social feed where content from friends, family, news publishers, and brands all compete for the same scroll. Unlike LinkedIn (professional credibility) or X (compressed discourse), the dominant register here is personal and social — people arrive to see what their network is doing and thinking, not to be informed or professionally enriched.

What performs well reads like something a trusted friend shared: a personal reaction to an idea, a story triggered by reading something, a genuine question opened to the room. Posts that read like information delivery, marketing copy, or thought leadership land poorly in this context.

The Facebook algorithm prioritizes content that generates comments over passive engagement. Posts that end by genuinely inviting the reader's own experience or opinion consistently outperform posts that close. Link previews auto-generate from shared URLs — the post text should contextualize or react to the content, not summarize it.`,

  preWritingFramework: `Before writing, work through these questions:

1. What's the personal angle? Not "what is this article about" but "what does someone's reaction to this article sound like when they share it with friends?" That's the voice.

2. What are the first 250 characters? Facebook mobile truncates at roughly 3 lines before "See more." If the first 250 characters don't earn the click, the post dies. Write the hook before writing anything else.

3. What does this invite? The best Facebook posts end with an implicit or explicit opening for the reader's own story, opinion, or experience. Not a CTA — a genuine conversational opening.

4. Is this a personal profile post or a Page post? Personal: first-person, narrative, conversational. Page: slightly shorter, benefit-focused, still warm but with a clearer point of action.

5. Would your friend read this and say "interesting, this happened to me too" or "I have thoughts on this"? That's the engagement signal. If they'd just nod and scroll, the post needs a stronger hook or question.`,

  structuralRules: [
    'Open with a hook that works in the first 250 characters — this is what shows before "See more" on mobile',
    'Write in first person with a personal narrative angle — share a reaction, a story, or a perspective, not just the article',
    'Use short conversational paragraphs (1–3 sentences each) — dense blocks break on mobile',
    'End with a genuine engagement hook: a question that invites the reader\'s own experience, story, or opinion',
    'When sharing a URL, let the link preview handle "what is this" — the post text should provide the personal context or reaction',
    'Paragraph breaks are editorial; use them to create rhythm, not just to avoid walls of text',
    'Write at a conversational register: complete sentences, natural rhythm, no hashtags',
    'Personal posts: 150–300 words; Page posts: 80–150 words',
  ],

  lengthTarget: '150–300 words for personal profiles; 80–150 words for Page/brand posts. Long enough to tell a story, short enough not to hit the "wall of text" scroll reflex.',

  antiPatterns: [
    'Hashtags of any kind — hashtags actively suppress organic reach on Facebook; do not include any',
    '"Excited to share," "thrilled to announce," or any variation of excited-to-share language',
    'LinkedIn authority cadence: short-line stacking, competence signaling, credentialed contrarianism',
    'Generic calls to action: "check this out," "link below," "click here," "learn more"',
    'Thread formatting: numbered posts, multi-part arcs — this is a single-post surface',
    'Pure information delivery without a personal frame, reaction, or narrative',
    'Dense prose blocks without paragraph breaks',
    'Corporate passive voice: "it has been noted that," "research suggests"',
    '"In today\'s world," "In this day and age," "In the current landscape"',
    'Hollow engagement bait: "Double tap if you agree," "Tag someone who needs this"',
    'Restating the article headline — the link preview already does this',
  ],
}
