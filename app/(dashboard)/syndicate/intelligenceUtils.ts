import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'

export function tokenize(text: string, max = 6): string[] {
  return text.split(/[,;]|\s+(?:and|with|plus)\s+/i).map(s => s.trim()).filter(Boolean).slice(0, max)
}

export function deriveToneTags(tone: string): string[] {
  return tone.split(/,|\s+with\s+/i).map(s => s.trim()).filter(Boolean).slice(0, 3)
    .map(t => t.length > 30 ? t.slice(0, 30) : t)
}

export function deriveEmotionalDrivers(intel: SyndicationIntelligence): string[] {
  const tokens = [...tokenize(intel.emotional_style, 3), ...intel.persuasive_mechanics.flatMap(m => tokenize(m, 2)).slice(0, 3)]
  const seen = new Set<string>()
  return tokens.filter(t => { const k = t.toLowerCase(); return seen.has(k) ? false : (seen.add(k), true) }).slice(0, 6)
}

export function deriveAudienceAngles(audience: string): string[] {
  return tokenize(audience, 4)
}

export function estimateTweetCount(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 40))
}

export function estimateReadTime(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200))
}

export function extractHook(content: string): string {
  return content.match(/^[^.!?]+[.!?]/)?.[0].trim() ?? content.slice(0, 120)
}

export function extractHeadline(content: string): string {
  const line = content.split('\n')[0]?.trim() ?? ''
  return line.length > 0 ? line : content.slice(0, 80)
}

export function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const t = text.slice(0, max)
  const i = t.lastIndexOf(' ')
  return (i > 0 ? t.slice(0, i) : t) + '…'
}

export function deriveLensImpact(lensName: string): string[] {
  const impacts: Record<string, string[]> = {
    Contrarian:   ['increased narrative tension', 'amplified ideological contrast', 'optimized for disagreement-driven engagement'],
    Founder:      ['reframed as operational insight', 'added earned-experience authority', 'shifted from theory to practice'],
    Intellectual: ['elevated abstraction level', 'connected to broader systems', 'added conceptual precision'],
    Technical:    ['surfaced mechanism over metaphor', 'added precision and specificity', 'named components explicitly'],
    Emotional:    ['foregrounded human stakes', 'led with felt weight before argument', 'increased reader identification'],
    Operator:     ['translated to action-oriented framing', 'emphasized implementation over analysis', 'added direct utility'],
    Luxury:       ['increased register restraint', 'signaled through omission', 'raised perceived exclusivity'],
    Investor:     ['reframed around leverage and asymmetry', 'emphasized long-term compounding', 'added risk/return framing'],
    Signal:       ['surfaced institutional incentives', 'reframed local issue as systemic trend', 'expanded second-order implications'],
    Authority:    ['added credentialed perspective', 'increased professional authority signaling', 'structured around expertise'],
    Incentive:    ['mapped underlying incentive structure', 'exposed misaligned motivations', 'added structural critique'],
    Framework:    ['applied structured mental model', 'organized around analytical framework', 'increased analytical clarity'],
  }
  return impacts[lensName] ?? ['reframed content perspective', 'adjusted rhetorical register', 'modified audience targeting']
}
