import { marked } from 'marked'
import type { Token } from 'marked'
import { createHash } from 'crypto'
import type { CanonicalArticle, CanonicalNode } from './types'
import type { GeneratedBlogPackage } from '@/lib/blog/types'
import { generateSlug, generateExcerpt } from './normalizer'

function parseInlineHtml(text: string): string {
  return marked.parseInline(text) as string
}

function tokenToNodes(token: Token): CanonicalNode[] {
  switch (token.type) {
    case 'heading': {
      const level = Math.min(Math.max(token.depth, 2), 4) as 2 | 3 | 4
      return [{ type: 'heading', level, text: token.text }]
    }
    case 'paragraph':
      return [{ type: 'paragraph', html: parseInlineHtml(token.text) }]
    case 'blockquote': {
      const innerText = (token.tokens ?? [])
        .filter(t => t.type === 'paragraph')
        .map(t => t.raw)
        .join(' ')
        .trim() || token.raw.replace(/^>\s*/gm, '').trim()
      return [{ type: 'blockquote', html: parseInlineHtml(innerText) }]
    }
    case 'code':
      return [{ type: 'code', code: token.text, language: (token as { lang?: string }).lang ?? undefined }]
    case 'list': {
      const items = (token as { items: Array<{ text: string }> }).items
        .map(item => parseInlineHtml(item.text))
      return [{ type: 'list', ordered: (token as { ordered: boolean }).ordered, items }]
    }
    case 'hr':
      return [{ type: 'divider' }]
    case 'space':
      return []
    default:
      return []
  }
}

export function markdownToCanonicalBody(markdown: string): CanonicalNode[] {
  // Strip WordPress-style shortcodes before lexing
  const clean = markdown.replace(/\[[\w-]+[^\]]*\](?:[^[]*\[\/[\w-]+\])?/g, '')
  const tokens = marked.lexer(clean)
  return tokens.flatMap(tokenToNodes)
}

export function canonicalIdFromSource(workspaceId: string, sourceType: string, sourceId: string): string {
  return createHash('sha256')
    .update(`${workspaceId}:${sourceType}:${sourceId}`)
    .digest('hex')
    .slice(0, 32)
}

export function blogPackageToCanonical(
  pkg: GeneratedBlogPackage,
  workspaceId: string,
  sourceId: string,
): CanonicalArticle {
  const body = markdownToCanonicalBody(pkg.article.markdown)
  return {
    id:       canonicalIdFromSource(workspaceId, 'blog', sourceId),
    title:    pkg.article.title,
    slug:     generateSlug(pkg.article.title),
    excerpt:  generateExcerpt(pkg.article.markdown),
    dek:      pkg.article.subtitle,
    body,
    seo: {
      metaTitle:       pkg.metadata.metaTitle,
      metaDescription: pkg.metadata.metaDescription,
    },
    metadata: {
      wordCount:      pkg.article.wordCount,
      primaryKeyword: pkg.request.primaryKeyword,
    },
  }
}
