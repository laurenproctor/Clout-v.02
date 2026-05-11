import type { ValidationResult } from './types'
import { scoreHumanity } from '../scoring/humanity'

const THREADS_MAX = 500
const THREADS_WARN = 400

const CORPORATE_PHRASES = [
  'thrilled to announce', 'excited to share', 'pleased to announce', 'proud to announce',
  'game-changing', 'revolutionary', 'groundbreaking', 'paradigm shift',
  'leverage', 'synergy', 'synergize', 'unlock', 'empower', 'ecosystem',
  'thought leadership', 'best practices', 'actionable insights',
  'move the needle', 'circle back', 'deep dive', 'pivot',
]

const CTA_PHRASES = [
  'link in bio', 'subscribe below', 'subscribe now', 'check it out', 'learn more',
  'click here', 'read more', 'sign up', 'download now', 'get started',
  'dm me', 'send me a message', 'reach out',
]

const LIST_OPENERS = [
  /^\d+\.\s/, /^here are \d+/i, /^here's \d+/i, /^\d+ things/i,
  /^\d+ ways/i, /^\d+ tips/i, /^\d+ reasons/i,
]

const LINKEDIN_PATTERNS = [
  /^as an? [a-z]+,/i,           // "As a founder,"
  /^as someone who/i,
  /in my \d+ years/i,
  /throughout my career/i,
  /^I'm humbled/i,
]

export function validateThreadsPost(text: string): ValidationResult {
  const technicalErrors: string[] = []
  const qualityWarnings: string[] = []
  const platformRisks: string[] = []

  if (!text.trim()) {
    return { publishable: false, technicalErrors: ['Post is empty'], qualityWarnings: [], platformRisks: [] }
  }

  // Technical errors (hard blockers)
  if (text.length > THREADS_MAX) {
    technicalErrors.push(`Over character limit: ${text.length} / ${THREADS_MAX}`)
  }

  // Quality warnings
  if (text.length > THREADS_WARN && text.length <= THREADS_MAX) {
    qualityWarnings.push(`Approaching character limit (${text.length} / ${THREADS_MAX})`)
  }

  const lower = text.toLowerCase()

  const hashtags = (text.match(/#\w+/g) ?? []).length
  if (hashtags > 1) {
    qualityWarnings.push(`${hashtags} hashtags detected — Threads works better with 0 or 1`)
  }

  const emojis = (text.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) ?? []).length
  if (emojis > 3) {
    qualityWarnings.push(`${emojis} emoji detected — reduces conversational feel`)
  }

  const hasListOpener = LIST_OPENERS.some(re => re.test(text.trim()))
  if (hasListOpener) {
    qualityWarnings.push('List format detected — flows better as prose on Threads')
  }

  const humanity = scoreHumanity(text)
  if (humanity.score < 40) {
    qualityWarnings.push(`Low conversational signal — ${humanity.flags.slice(0, 2).join(', ')}`)
  }

  // Platform risks
  const corporateHits = CORPORATE_PHRASES.filter(p => lower.includes(p))
  if (corporateHits.length > 0) {
    platformRisks.push(`Corporate phrasing detected: "${corporateHits[0]}"`)
  }

  const ctaHits = CTA_PHRASES.filter(p => lower.includes(p))
  if (ctaHits.length > 0) {
    platformRisks.push('CTA-heavy — Threads readers resist promotional language')
  }

  const isLinkedIn = LINKEDIN_PATTERNS.some(re => re.test(text))
  if (isLinkedIn) {
    platformRisks.push('Opener reads like LinkedIn — too much authority signaling')
  }

  // Tweetstorm pattern: many very short lines with no paragraph structure
  const lines = text.split('\n').filter(l => l.trim())
  const shortLines = lines.filter(l => l.trim().length < 40)
  if (lines.length >= 4 && shortLines.length / lines.length > 0.7) {
    platformRisks.push('Tweetstorm cadence — Threads favors flowing prose over stacked one-liners')
  }

  const publishable = technicalErrors.length === 0

  return { publishable, technicalErrors, qualityWarnings, platformRisks }
}
