// lib/linkedin/richText.ts
// The rich-text serialization contract for LinkedIn posts.
//
// LinkedIn has no rich-text marks: bold/italic only render as Unicode math
// glyphs, and post `commentary` is `little`-format text with reserved chars
// that must be escaped. So one sanitized document produces three outputs:
//
//   sanitizeTiptapDoc(input)            ← trust boundary (content is client-mutable)
//     → docToSegments(doc)              ← shared semantic layer
//         → renderDisplayText(segs)     ← clipboard / preview (Unicode, no escaping)
//         → renderApiCommentary(segs)   ← publish only (little-safe: escaped reserved chars)
//     → docToPlainText(doc)             ← legacy body, counts, AI transforms, search
//
// Pure and deterministic — no TipTap/runtime deps, so it is fully unit-testable.

// ── Constrained document schema ────────────────────────────────────────────
export type Mark = 'bold' | 'italic'
export interface TextNode { type: 'text'; text: string; marks?: { type: string }[] }
export interface MentionNode { type: 'mention'; attrs: { name: string; id?: string | null } }
export interface HardBreakNode { type: 'hardBreak' }
export type InlineNode = TextNode | MentionNode | HardBreakNode
export interface ParagraphNode { type: 'paragraph'; content?: InlineNode[] }
export interface TiptapDoc { type: 'doc'; content: ParagraphNode[] }

export const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [] }

export interface Segment {
  text: string
  bold?: boolean
  italic?: boolean
  /** Present when this segment is an inline mention node. */
  mention?: { name: string; id: string | null }
  /** URL/email/hashtag/handle/mention — never Unicode-transformed. */
  protected?: boolean
}

// ── Sanitization caps (client JSON is treated as hostile) ──────────────────
const MAX_TEXT_CHARS = 20_000
const MAX_PARAGRAPHS = 4_000
const MAX_INLINE_PER_PARAGRAPH = 4_000
const URN_RE = /^urn:li:(person|organization):[A-Za-z0-9_-]+$/

// ── Unicode Mathematical Alphanumeric Symbols (sans-serif families) ─────────
const CP_A = 0x41, CP_Z = 0x5a, CP_a = 0x61, CP_z = 0x7a, CP_0 = 0x30, CP_9 = 0x39
interface UMap { upper: number; lower: number; digit: number | null }
const BOLD: UMap = { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec }
const ITALIC: UMap = { upper: 0x1d608, lower: 0x1d622, digit: null } // no sans italic digits
const BOLD_ITALIC: UMap = { upper: 0x1d63c, lower: 0x1d656, digit: null }

function mapCodePoint(ch: string, m: UMap): string {
  const cp = ch.codePointAt(0)!
  if (cp >= CP_A && cp <= CP_Z) return String.fromCodePoint(m.upper + (cp - CP_A))
  if (cp >= CP_a && cp <= CP_z) return String.fromCodePoint(m.lower + (cp - CP_a))
  if (m.digit != null && cp >= CP_0 && cp <= CP_9) return String.fromCodePoint(m.digit + (cp - CP_0))
  return ch // safe-only: everything else (accents, emoji, punctuation, non-Latin) passes through
}

export function toUnicode(str: string, opts: { bold?: boolean; italic?: boolean }): string {
  if (!opts.bold && !opts.italic) return str
  const m = opts.bold && opts.italic ? BOLD_ITALIC : opts.bold ? BOLD : ITALIC
  return [...str].map((ch) => mapCodePoint(ch, m)).join('')
}

/** Code-point count (math glyphs are astral / surrogate pairs — JS `.length` overcounts). */
export function countLinkedInChars(str: string): number {
  return [...str].length
}

// ── Protected-token splitting (URLs, emails, hashtags, handles) ─────────────
const TOKEN_RE =
  /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s@]+@[^\s@]+\.[^\s@]+|#[\p{L}\p{N}_]+|@[\p{L}\p{N}_.]+)/gu

function splitProtected(text: string): Array<{ text: string; protected?: boolean }> {
  if (text === '') return []
  const out: Array<{ text: string; protected?: boolean }> = []
  let last = 0
  for (const m of text.matchAll(TOKEN_RE)) {
    const start = m.index!
    if (start > last) out.push({ text: text.slice(last, start) })
    out.push({ text: m[0], protected: true })
    last = start + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

// ── little reserved-character escaping (publish only) ───────────────────────
const RESERVED_RE = /[@[\]()#*_~{}<>\\|]/g
function escapeReserved(s: string): string {
  return s.replace(RESERVED_RE, (m) => '\\' + m)
}
function isUrn(id: string | null | undefined): id is string {
  return typeof id === 'string' && URN_RE.test(id)
}

// ── Sanitization ────────────────────────────────────────────────────────────
function sanitizeInline(content: unknown, budget: { chars: number }): InlineNode[] {
  if (!Array.isArray(content)) return []
  const out: InlineNode[] = []
  for (const node of content) {
    if (out.length >= MAX_INLINE_PER_PARAGRAPH) break
    if (!node || typeof node !== 'object') continue
    const n = node as Record<string, unknown>
    if (n.type === 'text') {
      let text = typeof n.text === 'string' ? n.text : ''
      if (!text) continue
      if (budget.chars + text.length > MAX_TEXT_CHARS) text = text.slice(0, Math.max(0, MAX_TEXT_CHARS - budget.chars))
      if (!text) continue
      budget.chars += text.length
      const marks = Array.isArray(n.marks)
        ? (n.marks as Array<Record<string, unknown>>)
            .filter((m) => m && (m.type === 'bold' || m.type === 'italic'))
            .map((m) => ({ type: m.type as string }))
        : undefined
      out.push(marks && marks.length ? { type: 'text', text, marks } : { type: 'text', text })
    } else if (n.type === 'hardBreak') {
      out.push({ type: 'hardBreak' })
    } else if (n.type === 'mention') {
      const attrs = (n.attrs ?? {}) as Record<string, unknown>
      const name = typeof attrs.name === 'string' ? attrs.name : ''
      if (!name) continue
      const id = isUrn(attrs.id as string) ? (attrs.id as string) : null
      out.push({ type: 'mention', attrs: { name, id } })
    }
    // everything else (unknown inline nodes, link/strike marks' wrappers) is dropped
  }
  return out
}

/** Flatten arbitrary block nodes (headings, lists) into a flat list of paragraphs. */
function flattenToParagraphs(nodes: unknown, budget: { chars: number }, depth: number): ParagraphNode[] {
  if (!Array.isArray(nodes) || depth > 6) return []
  const out: ParagraphNode[] = []
  for (const node of nodes) {
    if (out.length >= MAX_PARAGRAPHS) break
    if (!node || typeof node !== 'object') continue
    const n = node as Record<string, unknown>
    if (n.type === 'paragraph' || n.type === 'heading') {
      out.push({ type: 'paragraph', content: sanitizeInline(n.content, budget) })
    } else if (Array.isArray(n.content)) {
      // lists, blockquotes, listItems, etc. → flatten their block children
      out.push(...flattenToParagraphs(n.content, budget, depth + 1))
    }
  }
  return out
}

export function sanitizeTiptapDoc(input: unknown): TiptapDoc {
  if (!input || typeof input !== 'object') return EMPTY_DOC
  const root = input as Record<string, unknown>
  if (root.type !== 'doc' || !Array.isArray(root.content)) return EMPTY_DOC
  const content = flattenToParagraphs(root.content, { chars: 0 }, 0)
  return { type: 'doc', content }
}

// ── docFromPlainText (single canonical fallback builder) ────────────────────
export function docFromPlainText(body: string): TiptapDoc {
  if (!body) return { type: 'doc', content: [] }
  const paragraphs = body.split('\n\n')
  const content: ParagraphNode[] = paragraphs.map((chunk) => {
    const lines = chunk.split('\n')
    const inline: InlineNode[] = []
    lines.forEach((line, i) => {
      if (i > 0) inline.push({ type: 'hardBreak' })
      if (line) inline.push({ type: 'text', text: line })
    })
    return { type: 'paragraph', content: inline }
  })
  return { type: 'doc', content }
}

// ── Conversions ─────────────────────────────────────────────────────────────
export function docToPlainText(doc: unknown): string {
  const clean = sanitizeTiptapDoc(doc)
  return clean.content
    .map((para) =>
      (para.content ?? [])
        .map((node) =>
          node.type === 'hardBreak' ? '\n' : node.type === 'mention' ? '@' + node.attrs.name : node.text,
        )
        .join(''),
    )
    .join('\n\n')
}

export function docToSegments(doc: unknown): Segment[] {
  const clean = sanitizeTiptapDoc(doc)
  const segs: Segment[] = []
  clean.content.forEach((para, i) => {
    if (i > 0) segs.push({ text: '\n\n' })
    for (const node of para.content ?? []) {
      if (node.type === 'hardBreak') {
        segs.push({ text: '\n' })
      } else if (node.type === 'mention') {
        segs.push({ text: '@' + node.attrs.name, mention: { name: node.attrs.name, id: node.attrs.id ?? null }, protected: true })
      } else {
        const marks = new Set((node.marks ?? []).map((m) => m.type))
        const bold = marks.has('bold') || undefined
        const italic = marks.has('italic') || undefined
        for (const span of splitProtected(node.text)) {
          segs.push({ text: span.text, bold, italic, protected: span.protected || undefined })
        }
      }
    }
  })
  return segs
}

/** Clipboard / preview text: Unicode emphasis, protected tokens intact, NO escaping. */
export function renderDisplayText(segments: Segment[]): string {
  return segments
    .map((s) => {
      if (s.mention) return '@' + s.mention.name
      if (s.protected) return s.text
      return toUnicode(s.text, { bold: s.bold, italic: s.italic })
    })
    .join('')
}

/** Publish commentary: little-safe (escaped reserved chars in prose; protected tokens raw). */
export function renderApiCommentary(segments: Segment[]): string {
  return segments
    .map((s) => {
      if (s.mention) {
        return isUrn(s.mention.id)
          ? `@[${s.mention.name}](${s.mention.id})`
          : '\\@' + escapeReserved(s.mention.name)
      }
      if (s.protected) return s.text // URLs/hashtags/handles stay linkable
      return escapeReserved(toUnicode(s.text, { bold: s.bold, italic: s.italic }))
    })
    .join('')
}

// ── High-level composers used by copy + publish ─────────────────────────────
export function docToDisplayText(doc: unknown): string {
  return renderDisplayText(docToSegments(doc))
}
export function docToApiCommentary(doc: unknown): string {
  return renderApiCommentary(docToSegments(doc))
}
/** True when a doc has any renderable text — lets callers fall back to plain `body`. */
export function docHasContent(doc: unknown): boolean {
  return docToPlainText(doc).trim().length > 0
}
