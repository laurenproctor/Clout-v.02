// Renders CanonicalArticle body to HTML for providers that accept HTML content
// (WordPress, Ghost). Deliberately minimal — no classes, no IDs, provider adds those.
import type { CanonicalNode } from '@/lib/publishing/canonical/types'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nodeToHtml(node: CanonicalNode): string {
  switch (node.type) {
    case 'heading':
      return `<h${node.level}>${node.text}</h${node.level}>`

    case 'paragraph':
      return `<p>${node.html}</p>`

    case 'blockquote':
      return node.attribution
        ? `<blockquote><p>${node.html}</p><cite>${node.attribution}</cite></blockquote>`
        : `<blockquote><p>${node.html}</p></blockquote>`

    case 'code': {
      const langAttr = node.language ? ` class="language-${node.language}"` : ''
      return `<pre><code${langAttr}>${escapeHtml(node.code)}</code></pre>`
    }

    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul'
      const items = node.items.map(item => `<li>${item}</li>`).join('\n')
      return `<${tag}>\n${items}\n</${tag}>`
    }

    case 'image': {
      const caption = node.caption
        ? `<figcaption>${node.caption}</figcaption>`
        : ''
      return `<figure><img src="${node.url}" alt="${node.alt ?? ''}">${caption}</figure>`
    }

    case 'divider':
      return '<hr>'

    case 'embed':
      // Providers handle embeds differently — emit a plain link for now
      return `<p><a href="${node.url}" rel="noopener noreferrer">${node.url}</a></p>`

    default:
      return ''
  }
}

export function canonicalBodyToHtml(nodes: CanonicalNode[]): string {
  return nodes
    .map(nodeToHtml)
    .filter(Boolean)
    .join('\n\n')
}

// Adds target="_blank" rel to external links already in inline HTML
export function finalizeHtmlForWordPress(html: string): string {
  return html.replace(
    /<a\s+href="(https?:\/\/[^"]+)"/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"',
  )
}
