// lib/visual/prompt/providerTranslation.ts
// Provider-specific prompt formatting.
// New providers add a case here — no changes needed elsewhere.
//
// DALL-E 3 performs best with period-separated descriptive clauses.
// Future providers (Flux, Ideogram) may prefer different structures.

export type SupportedProvider = 'openai'

export function formatPromptForProvider(
  clauses: string[],
  provider: SupportedProvider = 'openai'
): string {
  switch (provider) {
    case 'openai':
      // DALL-E 3: period-joined clauses, no JSON, no markdown
      return clauses
        .filter(c => c.trim().length > 0)
        .join('. ')
        .replace(/\.\./g, '.') // guard against double-period from empty clauses
  }
}
