import type { InferredIntent, NormalizedGoal } from '@/types/domain'

const GENERATION_HINTS: Record<string, string> = {
  'publish:post':       'Write a punchy, opinionated post with a strong hook. Get to the point fast.',
  'publish:thread':     'Write a numbered thread. Each point is self-contained and could stand alone.',
  'publish:newsletter': 'Write in a thoughtful founder voice. Use clear sections. Personal but authoritative.',
  'publish:article':    'Write a structured long-form piece with subheadings. Build an argument.',
  'publish:note':       'Write a clear, direct note. No CTA needed.',
  'reflect:note':       'Write in first person, reflective. Process the thought. No performance.',
  'reflect:post':       'Write a personal reflection. Honest and specific. Less polish, more truth.',
  'brainstorm:note':    'Surface ideas as loose bullet clusters. Stay unpolished. Capture the shape.',
  'brainstorm:post':    'Write a generative take — options, questions, open possibilities.',
  'educate:post':       'Teach one concept clearly. Use one analogy. End with the takeaway.',
  'educate:article':    'Build the idea step by step. Assume a smart reader who is new to this.',
  'educate:thread':     'Break the lesson into discrete steps. Each tweet teaches something.',
  'summarize:note':     'Extract the key points clearly. No editorializing.',
  'document:note':      'Preserve the facts and sequence. Neutral tone.',
  'debate:post':        'Take a clear stance. State the opposing view. Explain why you disagree.',
  'debate:article':     'Make the argument rigorously. Steelman the other side. Then dismantle it.',
}

export function normalizeGoal(intent: InferredIntent): NormalizedGoal {
  const key = `${intent.intentClass}:${intent.outputFormat}`
  const hint = GENERATION_HINTS[key] ?? 'Write clearly and concisely in the author\'s voice.'

  return {
    intentClass: intent.intentClass,
    outputFormat: intent.outputFormat,
    tone: intent.tone,
    isPrivate: intent.isPrivate,
    suggestedChannel: intent.suggestedChannel,
    generationHint: hint,
  }
}
