import { describe, it, expect } from 'vitest'
import { serializeForCopy } from './serializeForCopy'
import { docFromPlainText, type TiptapDoc } from '@/lib/linkedin/richText'

const doc = (...content: unknown[]): TiptapDoc => ({ type: 'doc', content }) as TiptapDoc
const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const t = (text: string, ...marks: Array<'bold' | 'italic'>) =>
  marks.length ? { type: 'text', text, marks: marks.map((type) => ({ type })) } : { type: 'text', text }

describe('serializeForCopy', () => {
  it('uses plain body when no rich doc is provided (legacy path unchanged)', () => {
    expect(serializeForCopy('Hello world', ['Growth'])).toBe('Hello world\n\n#Growth')
  })

  it('renders bold as Unicode glyphs from bodyRich (clipboard, no escaping)', () => {
    const rich = doc(p(t('Hello '), t('world', 'bold')))
    const out = serializeForCopy('Hello world', [], rich)
    expect(out).toBe('Hello 𝘄𝗼𝗿𝗹𝗱')
    expect(out).not.toContain('\\')
  })

  it('dedupes hashtags against the rendered display text', () => {
    const rich = docFromPlainText('Post about #Growth')
    // #Growth already present → not appended again
    expect(serializeForCopy('Post about #Growth', ['Growth'])).toBe('Post about #Growth')
    expect(serializeForCopy('ignored', ['Growth'], rich)).toBe('Post about #Growth')
  })
})
