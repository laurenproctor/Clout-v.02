import { RichText } from '@atproto/api'
import type { Agent } from '@atproto/api'

// Lightweight script-based fallback, NOT true language detection.
// French, Spanish, German, Portuguese etc. all resolve to 'en' (Latin script).
// Accurate for CJK, Arabic, Cyrillic, Hebrew, Devanagari.
// Replace with a proper language detection library if multilingual accuracy matters.
export function detectLang(text: string): string {
  if (/[一-鿿぀-ヿㇰ-ㇿ]/.test(text)) return 'zh'
  if (/[가-힯]/.test(text)) return 'ko'
  if (/[؀-ۿ]/.test(text)) return 'ar'
  if (/[Ѐ-ӿ]/.test(text)) return 'ru'
  if (/[֐-׿]/.test(text)) return 'he'
  if (/[ऀ-ॿ]/.test(text)) return 'hi'
  return 'en'
}

export async function buildRichText(
  text: string,
  agent: Agent,
): Promise<{ text: string; facets: unknown[] | undefined; langs: string[] }> {
  const rt = new RichText({ text })
  await rt.detectFacets(agent)
  return {
    text:   rt.text,
    facets: rt.facets,
    langs:  [detectLang(rt.text)],
  }
}
