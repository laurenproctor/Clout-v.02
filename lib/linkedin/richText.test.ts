import { describe, it, expect } from 'vitest'
import {
  sanitizeTiptapDoc,
  docFromPlainText,
  docToPlainText,
  docToSegments,
  renderDisplayText,
  renderApiCommentary,
  docToDisplayText,
  docToApiCommentary,
  toUnicode,
  countLinkedInChars,
  EMPTY_DOC,
  type TiptapDoc,
} from './richText'

// ── doc builders (constrained schema) ─────────────────────────────────────
const t = (text: string, ...marks: Array<'bold' | 'italic'>) =>
  marks.length ? { type: 'text', text, marks: marks.map((type) => ({ type })) } : { type: 'text', text }
const men = (name: string, id: string | null = null) => ({ type: 'mention', attrs: { name, id } })
const br = () => ({ type: 'hardBreak' })
const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]): TiptapDoc => ({ type: 'doc', content }) as TiptapDoc

const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!)

describe('toUnicode', () => {
  it('maps letters to sans-serif bold', () => {
    expect(cps(toUnicode('B', { bold: true }))).toEqual([0x1d5d5])
    expect(cps(toUnicode('o', { bold: true }))).toEqual([0x1d5fc])
    expect(toUnicode('Bold', { bold: true })).toBe('𝗕𝗼𝗹𝗱')
  })

  it('maps letters to sans-serif italic', () => {
    expect(cps(toUnicode('A', { italic: true }))).toEqual([0x1d608])
    expect(cps(toUnicode('a', { italic: true }))).toEqual([0x1d622])
  })

  it('maps letters to sans-serif bold-italic when both marks set', () => {
    expect(cps(toUnicode('A', { bold: true, italic: true }))).toEqual([0x1d63c])
    expect(cps(toUnicode('a', { bold: true, italic: true }))).toEqual([0x1d656])
  })

  it('maps digits for bold but passes digits through for italic (no italic digit glyphs)', () => {
    expect(cps(toUnicode('0', { bold: true }))).toEqual([0x1d7ec])
    expect(toUnicode('0', { italic: true })).toBe('0')
    expect(toUnicode('7', { bold: true, italic: true })).toBe('7')
  })

  it('passes unsupported characters through unchanged', () => {
    // accents, smart quotes, emoji, punctuation, non-Latin
    expect(toUnicode('é ñ ’ 😀 ! 日本', { bold: true })).toBe('é ñ ’ 😀 ! 日本')
  })

  it('returns input unchanged when no marks', () => {
    expect(toUnicode('Plain 123', {})).toBe('Plain 123')
  })
})

describe('countLinkedInChars', () => {
  it('counts astral (surrogate-pair) glyphs as one char each', () => {
    expect(countLinkedInChars('Bold')).toBe(4)
    expect(countLinkedInChars('𝗕𝗼𝗹𝗱')).toBe(4) // not 8
    expect(countLinkedInChars('😀')).toBe(1) // not 2
  })
})

describe('docFromPlainText', () => {
  it('builds a paragraph per line and round-trips through docToPlainText', () => {
    const d = docFromPlainText('line one\nline two\n\npara two')
    expect(docToPlainText(d)).toBe('line one\nline two\n\npara two')
  })

  it('produces EMPTY_DOC-equivalent plain text for empty input', () => {
    expect(docToPlainText(docFromPlainText(''))).toBe('')
  })
})

describe('docToPlainText', () => {
  it('strips marks and renders a mention as @Name', () => {
    const d = doc(p(t('Hi '), t('there', 'bold'), t(' '), men('Jane Doe')))
    expect(docToPlainText(d)).toBe('Hi there @Jane Doe')
  })

  it('joins paragraphs with a blank line and hardBreak with a single newline', () => {
    const d = doc(p(t('a'), br(), t('b')), p(t('c')))
    expect(docToPlainText(d)).toBe('a\nb\n\nc')
  })

  it('returns empty string for an empty doc', () => {
    expect(docToPlainText(EMPTY_DOC)).toBe('')
  })
})

describe('docToSegments — marks + protected tokens', () => {
  it('flags bold/italic runs', () => {
    const d = doc(p(t('x '), t('y', 'bold', 'italic')))
    const segs = docToSegments(d).filter((s) => s.text.trim() !== '' || s.text === ' ')
    const y = segs.find((s) => s.text === 'y')!
    expect(y.bold).toBe(true)
    expect(y.italic).toBe(true)
  })

  it('splits a URL out of a bold run and marks it protected', () => {
    const d = doc(p(t('see https://somafina.com now', 'bold')))
    const segs = docToSegments(d)
    const url = segs.find((s) => s.text === 'https://somafina.com')!
    expect(url.protected).toBe(true)
    expect(url.bold).toBe(true)
    // surrounding prose stays bold + unprotected
    expect(segs.find((s) => s.text === 'see ')!.protected).toBeFalsy()
  })

  it('marks hashtags, handles, and emails as protected', () => {
    const d = doc(p(t('#Growth and @handle and a@b.com', 'italic')))
    const segs = docToSegments(d)
    expect(segs.find((s) => s.text === '#Growth')!.protected).toBe(true)
    expect(segs.find((s) => s.text === '@handle')!.protected).toBe(true)
    expect(segs.find((s) => s.text === 'a@b.com')!.protected).toBe(true)
  })
})

describe('renderDisplayText (clipboard / preview) — Unicode, no escaping', () => {
  it('applies Unicode emphasis but leaves protected tokens intact', () => {
    const d = doc(p(t('read '), t('this', 'bold'), t(' at '), t('https://somafina.com', 'bold')))
    const out = docToDisplayText(d)
    expect(out).toContain('𝘁𝗵𝗶𝘀') // "this" bolded
    expect(out).toContain('https://somafina.com') // URL untouched
    expect(out).not.toContain('\\') // no escaping in clipboard
  })

  it('renders a bolded hashtag as a plain #Hashtag (not glyphs)', () => {
    const d = doc(p(t('#Sustainability', 'bold')))
    expect(docToDisplayText(d)).toBe('#Sustainability')
  })

  it('renders a mention as plain @Name', () => {
    const d = doc(p(men('Jane Doe')))
    expect(docToDisplayText(d)).toBe('@Jane Doe')
  })
})

describe('renderApiCommentary (publish) — little-safe', () => {
  it('escapes reserved characters in plain prose only', () => {
    const d = doc(p(t('cost * time _ end')))
    expect(docToApiCommentary(d)).toBe('cost \\* time \\_ end')
  })

  it('does NOT escape reserved chars inside protected tokens (keeps URLs/hashtags linkable)', () => {
    const d = doc(p(t('grow #B2B at https://x.com/a_b now')))
    const out = docToApiCommentary(d)
    expect(out).toContain('#B2B')
    expect(out).toContain('https://x.com/a_b') // underscore in URL not escaped
  })

  it('applies Unicode emphasis to prose the same way as display', () => {
    const d = doc(p(t('Bold', 'bold')))
    expect(docToApiCommentary(d)).toBe('𝗕𝗼𝗹𝗱')
  })

  it('v1 mention (id=null) publishes as escaped plain @Name, never raw little-syntax', () => {
    const d = doc(p(men('Jane Doe')))
    const out = docToApiCommentary(d)
    expect(out).toBe('\\@Jane Doe')
    expect(out).not.toContain('](') // no injected annotation syntax
  })

  it('mention with a valid URN emits a MentionElement annotation', () => {
    const d = doc(p(men('Jane Doe', 'urn:li:person:123')))
    expect(docToApiCommentary(d)).toBe('@[Jane Doe](urn:li:person:123)')
  })
})

describe('sanitizeTiptapDoc — trust boundary', () => {
  it('strips unknown nodes and marks', () => {
    const hostile = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'ok', marks: [{ type: 'strike' }, { type: 'bold' }] }] },
      ],
    }
    const clean = sanitizeTiptapDoc(hostile)
    // heading downgraded to paragraph; strike stripped, bold kept
    expect(docToPlainText(clean)).toBe('H\n\nok')
    const segs = docToSegments(clean)
    expect(segs.find((s) => s.text === 'ok')!.bold).toBe(true)
  })

  it('drops a mention id that is not null and not a li URN', () => {
    const hostile = doc(p(men('X', 'javascript:evil')))
    const clean = sanitizeTiptapDoc(hostile)
    // id coerced to null → renders as plain text mention, not an annotation
    expect(docToApiCommentary(clean)).toBe('\\@X')
  })

  it('returns EMPTY_DOC for malformed input', () => {
    expect(sanitizeTiptapDoc(null)).toEqual(EMPTY_DOC)
    expect(sanitizeTiptapDoc('nope')).toEqual(EMPTY_DOC)
    expect(sanitizeTiptapDoc({ type: 'notdoc' })).toEqual(EMPTY_DOC)
  })
})

describe('copy/publish parity', () => {
  it('share the doc→segments pipeline, diverging only display-vs-API', () => {
    const d = doc(p(t('Hello '), t('world', 'bold'), t(' * '), men('Jane')))
    const segs = docToSegments(sanitizeTiptapDoc(d))
    expect(renderDisplayText(segs)).toBe(docToDisplayText(d))
    expect(renderApiCommentary(segs)).toBe(docToApiCommentary(d))
    // divergence: display keeps '*' and '@Jane'; API escapes them
    expect(docToDisplayText(d)).toContain(' * ')
    expect(docToDisplayText(d)).toContain('@Jane')
    expect(docToApiCommentary(d)).toContain(' \\* ')
    expect(docToApiCommentary(d)).toContain('\\@Jane')
  })
})
