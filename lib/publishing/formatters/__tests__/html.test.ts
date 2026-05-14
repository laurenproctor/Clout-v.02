import { describe, it, expect } from 'vitest'
import { canonicalBodyToHtml, finalizeHtmlForShopify } from '../providers/html'
import type { CanonicalNode } from '@/lib/publishing/canonical/types'

// ---------------------------------------------------------------------------
// canonicalBodyToHtml
// ---------------------------------------------------------------------------

describe('canonicalBodyToHtml', () => {
  it('renders a paragraph', () => {
    const nodes: CanonicalNode[] = [
      { type: 'paragraph', html: 'Hello <strong>world</strong>' },
    ]
    expect(canonicalBodyToHtml(nodes)).toContain(
      '<p>Hello <strong>world</strong></p>',
    )
  })

  it('renders an h2 heading', () => {
    const nodes: CanonicalNode[] = [
      { type: 'heading', level: 2, text: 'Section' },
    ]
    expect(canonicalBodyToHtml(nodes)).toContain('<h2>Section</h2>')
  })

  it('renders a code block with language class and escaped content', () => {
    const nodes: CanonicalNode[] = [
      { type: 'code', language: 'typescript', code: 'const x = 1' },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('<pre>')
    expect(result).toContain('const x = 1')
    expect(result).toContain('language-typescript')
  })

  it('renders an unordered list', () => {
    const nodes: CanonicalNode[] = [
      { type: 'list', ordered: false, items: ['Apple', 'Banana'] },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Apple</li>')
    expect(result).toContain('<li>Banana</li>')
  })

  it('renders an ordered list', () => {
    const nodes: CanonicalNode[] = [
      { type: 'list', ordered: true, items: ['First', 'Second'] },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('<ol>')
    expect(result).toContain('<li>First</li>')
    expect(result).toContain('<li>Second</li>')
  })

  it('renders a blockquote (content wrapped in <p> inside <blockquote>)', () => {
    const nodes: CanonicalNode[] = [
      { type: 'blockquote', html: 'A wise quote' },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('<blockquote>')
    expect(result).toContain('<p>A wise quote</p>')
  })

  it('renders a blockquote with attribution', () => {
    const nodes: CanonicalNode[] = [
      { type: 'blockquote', html: 'To be or not to be', attribution: 'Shakespeare' },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('<cite>Shakespeare</cite>')
  })

  it('handles an empty body', () => {
    expect(canonicalBodyToHtml([])).toBe('')
  })

  it('renders embed as a plain anchor link', () => {
    const nodes: CanonicalNode[] = [
      { type: 'embed', url: 'https://youtube.com/watch?v=abc', embedType: 'youtube' },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('https://youtube.com/watch?v=abc')
    expect(result).toContain('<a href="https://youtube.com/watch?v=abc"')
  })

  it('escapes HTML special characters in code blocks', () => {
    const nodes: CanonicalNode[] = [
      { type: 'code', code: 'if (a < b && b > c) return <T>' },
    ]
    const result = canonicalBodyToHtml(nodes)
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
    expect(result).not.toContain('<T>')
  })

  it('joins multiple nodes with double newlines', () => {
    const nodes: CanonicalNode[] = [
      { type: 'paragraph', html: 'First' },
      { type: 'paragraph', html: 'Second' },
    ]
    expect(canonicalBodyToHtml(nodes)).toBe('<p>First</p>\n\n<p>Second</p>')
  })
})

// ---------------------------------------------------------------------------
// finalizeHtmlForShopify
// ---------------------------------------------------------------------------

describe('finalizeHtmlForShopify', () => {
  it('strips script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>'
    const result = finalizeHtmlForShopify(input)
    expect(result).not.toContain('<script')
    expect(result).not.toContain('alert')
    expect(result).toContain('<p>Hello</p>')
  })

  it('strips iframes', () => {
    const input = '<p>Text</p><iframe src="https://youtube.com/embed/abc"></iframe>'
    const result = finalizeHtmlForShopify(input)
    expect(result).not.toContain('<iframe')
    expect(result).toContain('<p>Text</p>')
  })

  it('strips style attributes', () => {
    const input = '<p style="color:red">Text</p>'
    expect(finalizeHtmlForShopify(input)).not.toContain('style=')
  })

  it('strips class attributes', () => {
    const input = '<p class="highlight">Text</p>'
    expect(finalizeHtmlForShopify(input)).not.toContain('class=')
  })

  it('adds target="_blank" and rel to external https links', () => {
    const input = '<a href="https://example.com">Link</a>'
    const result = finalizeHtmlForShopify(input)
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('does NOT add target="_blank" to relative links', () => {
    const input = '<a href="/about">About</a>'
    expect(finalizeHtmlForShopify(input)).not.toContain('target="_blank"')
  })

  it('preserves text content after stripping attributes', () => {
    const input = '<p class="intro" style="font-size:16px">Hello world</p>'
    expect(finalizeHtmlForShopify(input)).toBe('<p>Hello world</p>')
  })

  it('handles multiline script blocks', () => {
    const input =
      '<p>Before</p>\n<script type="text/javascript">\nconsole.log("hi")\n</script>\n<p>After</p>'
    const result = finalizeHtmlForShopify(input)
    expect(result).not.toContain('console.log')
    expect(result).toContain('<p>Before</p>')
    expect(result).toContain('<p>After</p>')
  })
})
