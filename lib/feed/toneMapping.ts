import type { TonePreference } from '@/types/feed'

export function mapVoicesToTone(voices: string[]): TonePreference {
  const scores = { authoritative: 0, conversational: 0, provocative: 0 }
  for (const v of voices) {
    if (['Analytical', 'Executive', 'Technical'].includes(v)) scores.authoritative++
    else if (['Educational', 'Cultural'].includes(v)) scores.conversational++
    else if (['Contrarian', 'Visionary'].includes(v)) scores.provocative++
  }
  const max = Math.max(scores.authoritative, scores.conversational, scores.provocative)
  if (max === 0) return 'authoritative'
  if (scores.authoritative === max) return 'authoritative'
  if (scores.conversational === max) return 'conversational'
  return 'provocative'
}
