/* Marketing blog posts — original starter content in the Clout voice.
   Editable placeholder copy; replace with your real CMS/MDX source when ready. */

export type Post = {
  slug: string
  title: string
  date: string
  category: string
  read: string
  featured?: boolean
  excerpt: string
  body: { h: string | null; p: string }[]
}

export const POSTS: Post[] = [
  {
    slug: 'clarity-beats-volume',
    title: 'Why clarity beats volume in the age of infinite content',
    date: 'May 28, 2026',
    category: 'Strategy',
    read: '5 min read',
    featured: true,
    excerpt:
      "Everyone is publishing more. Almost no one is being understood. The leaders who win the next decade won't post the most — they'll be the clearest.",
    body: [
      { h: null, p: 'There has never been more content and less attention. Feeds refresh faster than anyone can think, and the reflex is to keep up by producing more. But volume is a trap. The more you publish without a point of view, the more you blend into the noise you were trying to rise above.' },
      { h: 'Clarity is a form of integrity', p: "When you say exactly what you mean, people trust you faster. Clarity signals that you've done the thinking — that there's a real position underneath the post, not just a prompt and a publish button. Audiences can feel the difference, even when they can't name it." },
      { h: 'Fewer ideas, shaped further', p: 'A single idea, distilled and pressure-tested, will outperform ten half-formed ones. Pick the belief you would defend in a room full of skeptics. Then give it the time it deserves: a clear thesis, a concrete example, and one honest line about why it matters.' },
      { h: 'What this looks like in practice', p: 'Before you publish, ask a harder question than "is this good?" Ask "is this clear, and is it mine?" If the answer is yes, you don\'t need to post five times this week. You need to post the one thing nobody else could have written.' },
    ],
  },
  {
    slug: 'five-minute-capture',
    title: 'The five-minute capture habit that feeds a year of content',
    date: 'May 14, 2026',
    category: 'Craft',
    read: '4 min read',
    excerpt:
      'Your best ideas already happened today — in a hallway, a commute, a half-finished sentence. Here is how to catch them before they vanish.',
    body: [
      { h: null, p: 'Most content problems are really capture problems. The idea was there; the moment passed. By the time you sat down to "create," the spark was gone and the blank page won.' },
      { h: 'Lower the friction to almost zero', p: "The habit isn't journaling. It's a thirty-second voice note the instant a thought lands. No structure, no editing, no judgment. You are not writing — you are catching. Structure is our job, later." },
      { h: 'Capture in the wild, refine at the desk', p: 'Separate the two modes completely. Capture is fast, messy, and constant. Refinement is slow and deliberate. When you stop asking raw ideas to arrive polished, you stop losing them.' },
      { h: 'A week of notes is a month of content', p: 'Five honest fragments a day becomes a library by Friday. Patterns emerge. The same belief keeps surfacing in different words — and that repetition is the seed of your point of view.' },
    ],
  },
  {
    slug: 'lenses-one-idea-ten-pieces',
    title: 'Lenses: how one idea becomes ten pieces of content',
    date: 'April 30, 2026',
    category: 'Product',
    read: '6 min read',
    excerpt:
      'A single belief can become an essay, a thread, a talk, and a podcast — without diluting it. The trick is changing the lens, not the idea.',
    body: [
      { h: null, p: 'Repurposing has a bad reputation because most of it is just reformatting — the same paragraph chopped into a carousel. Real adaptation changes the lens, not the words: the same idea seen through a different angle, audience, or moment.' },
      { h: 'The idea stays fixed', p: "Start from one belief you hold firmly. That's the constant. Everything downstream is a translation of it, never a replacement for it. Consistency of message is what builds authority over time." },
      { h: 'The lens moves', p: 'View the idea through your philosophy and it becomes an essay. Through a current event and it becomes a timely take. Through a personal story and it becomes a post people actually feel. Same core, different light.' },
      { h: 'Why this compounds', p: "Each piece reinforces the others. A reader who meets your idea three ways remembers it three times as well. You're not spreading yourself thin — you're driving one stake deeper." },
    ],
  },
  {
    slug: 'voice-keeping',
    title: 'Ghostwriting vs. voice-keeping: who should sound like you?',
    date: 'April 16, 2026',
    category: 'Voice',
    read: '5 min read',
    excerpt:
      "Outsourcing your writing doesn't have to mean outsourcing your voice. There's a better model — and it starts with you, not a blank brief.",
    body: [
      { h: null, p: "The fear with any kind of help is that the work stops sounding like you. It's a fair fear. Generic ghostwriting takes a vague brief and returns competent, forgettable copy that could belong to anyone." },
      { h: 'Voice-keeping starts from your raw material', p: "The alternative begins with your actual words — your voice notes, your asides, the way you argue when no one's watching. The job isn't to invent a voice. It's to keep yours, and make it legible." },
      { h: 'Human intelligence, guided by AI', p: 'AI handles structure, speed, and the first ninety percent of the draft. People handle taste, judgment, and the last ten percent that makes it sound human. Neither alone gets there.' },
      { h: 'The test', p: "Read the finished piece aloud. If it sounds like something you'd actually say at your best, it's working. If it sounds like a brand, start over." },
    ],
  },
  {
    slug: '1000-founder-voice-notes',
    title: 'What we learned reading 1,000 founder voice notes',
    date: 'April 2, 2026',
    category: 'Field notes',
    read: '7 min read',
    excerpt:
      'We studied how the sharpest people actually think out loud. The patterns surprised us — and they say a lot about where good ideas come from.',
    body: [
      { h: null, p: 'Over a few months we listened closely to how founders, operators, and creators capture ideas in the moment. Not their polished posts — their unfiltered, half-formed, thinking-out-loud notes. Here is what stood out.' },
      { h: 'The best ideas arrive sideways', p: 'Almost no one\'s strongest material came from sitting down to "create content." It came mid-task — explaining something to a colleague, reacting to a story, working a problem out loud. Insight is a byproduct, not a scheduled event.' },
      { h: 'Conviction is audible', p: 'You can hear the difference between an idea someone is testing and one they truly believe. The believed ones are shorter, plainer, and land harder. Conviction needs fewer words.' },
      { h: 'Consistency beats intensity', p: "The people who built real presence weren't the ones with occasional brilliant bursts. They were the ones who captured a little, every day, and trusted the process to compound." },
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug)
}
