// The canonical article is the durable, provider-agnostic representation of content.
// Providers receive a CanonicalArticle and decide how to render it.

export type CanonicalNodeType =
  | 'heading'
  | 'paragraph'
  | 'blockquote'
  | 'code'
  | 'list'
  | 'image'
  | 'divider'
  | 'embed'

export interface CanonicalHeading {
  type: 'heading'
  level: 2 | 3 | 4
  text: string
}

export interface CanonicalParagraph {
  type: 'paragraph'
  // NOTE: intentional V1 compromise — marked's inline renderer outputs HTML.
  // Future: migrate to TextNode/BoldNode/ItalicNode/LinkNode/CodeSpanNode when Notion
  // blocks, semantic editing, or structured citations become requirements.
  html: string   // inline HTML only (bold, em, links, code spans)
}

export interface CanonicalBlockquote {
  type: 'blockquote'
  // NOTE: same V1 inline-HTML compromise as CanonicalParagraph above
  html: string
  attribution?: string
}

export interface CanonicalCode {
  type: 'code'
  code: string
  language?: string
}

export interface CanonicalList {
  type: 'list'
  ordered: boolean
  items: string[]  // each item as inline HTML
}

export interface CanonicalImage {
  type: 'image'
  url: string
  alt?: string
  caption?: string
}

export interface CanonicalDivider {
  type: 'divider'
}

export interface CanonicalEmbed {
  type: 'embed'
  url: string
  embedType: 'youtube' | 'twitter' | 'generic'
}

export type CanonicalNode =
  | CanonicalHeading
  | CanonicalParagraph
  | CanonicalBlockquote
  | CanonicalCode
  | CanonicalList
  | CanonicalImage
  | CanonicalDivider
  | CanonicalEmbed

export interface Citation {
  url: string
  title?: string
  text?: string
}

export interface CanonicalArticle {
  id: string                     // stable reference (source ID or random UUID)
  title: string
  slug?: string
  dek?: string                   // subtitle / deck line
  excerpt?: string
  body: CanonicalNode[]
  heroImage?: CanonicalImage
  tags?: string[]
  categories?: string[]
  seo?: {
    metaTitle?: string
    metaDescription?: string
    canonicalUrl?: string
  }
  citations?: Citation[]
  metadata?: Record<string, unknown>
}
