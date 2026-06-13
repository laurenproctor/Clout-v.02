import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import type { SubstackArticleLength, SubstackArticleType } from '@/lib/syndication/platforms/substack'

export type SubstackSourceType = 'url' | 'text' | 'blog_post'

export interface SubstackGenerationRequest {
  sourceType:    SubstackSourceType
  sourceContent: string
  sourceUrl?:    string
  lensIds:       string[]
  articleType?:  SubstackArticleType
  length?:       SubstackArticleLength
}

export interface SubstackGeneratedArticle {
  title:     string
  subtitle?: string
  article:   CanonicalArticle
  // Raw parsed markdown body. Additive: the Substack Email creator stores this as the
  // editable content.body (Studio + the publishing bridge expect markdown, not canonical
  // JSON). The existing /create/substack article creator ignores it and uses `article`.
  markdown:  string
  wordCount: number
}

export type SubstackGenerationEvent =
  | { type: 'progress'; label: string }
  | { type: 'complete'; data: SubstackGeneratedArticle }
  | { type: 'error';    message: string }
