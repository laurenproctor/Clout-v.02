// Thread sequence narrative architecture.
// Arcs are guides — generation can and should deviate when content calls for it.
// Human threads loop, interrupt themselves, partially resolve, re-escalate.
// The arc is a starting shape, not a template.

export type ThreadPostRole =
  | 'hook'        // opens with tension or an interesting claim
  | 'tension'     // deepens the stakes or problem
  | 'reframe'     // shifts perspective or introduces a counter-idea
  | 'escalation'  // raises emotional or intellectual stakes
  | 'payoff'      // delivers resolution or insight
  | 'residue'     // leaves an open question or provocative thought

export interface ThreadNarrativeArc {
  postCount: number
  roles: ThreadPostRole[]
}

export interface ThreadPost {
  index: number
  role: ThreadPostRole
  content: string
  charCount: number
}

// Suggested arcs — not prescriptive. The generation prompt instructs the AI
// that it may deviate from the arc if the content calls for it.
export const THREAD_ARCS: Record<string, ThreadNarrativeArc> = {
  short: {
    postCount: 3,
    roles: ['hook', 'tension', 'payoff'],
  },
  standard: {
    postCount: 5,
    roles: ['hook', 'tension', 'reframe', 'payoff', 'residue'],
  },
  full: {
    postCount: 7,
    roles: ['hook', 'tension', 'reframe', 'escalation', 'reframe', 'payoff', 'residue'],
  },
}

export const THREAD_ROLE_DESCRIPTIONS: Record<ThreadPostRole, string> = {
  hook: 'Opens with tension or an interesting claim. Must create a reason to keep reading.',
  tension: 'Deepens the stakes. What is actually hard about this? What is the cost of the status quo?',
  reframe: 'Shifts perspective. Introduces a counter-idea, a less obvious angle, or a complication.',
  escalation: 'Raises the emotional or intellectual stakes. The stakes are higher than the reader thought.',
  payoff: 'Delivers resolution or insight. Does not need to be a tidy conclusion — just a landing.',
  residue: 'Leaves something open. A question, a tension, a provocation the reader carries with them.',
}
