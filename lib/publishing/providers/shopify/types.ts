// lib/publishing/providers/shopify/types.ts

// Increment when formatter output, payload shape, or GraphQL API version changes.
// Include in logs and published_content metadata for migration debugging.
export const SHOPIFY_PROVIDER_VERSION = '1'

export interface ShopifyShopInfo {
  id: string
  name: string
  domain: string
  myshopifyDomain: string
  primaryDomain: { url: string }
  currencyCode: string
  timezoneAbbreviation: string
}

export interface ShopifyBlog {
  id: string                 // GID: gid://shopify/Blog/12345
  handle: string
  title: string
  onlineStoreUrl: string | null
}

export interface ShopifyArticle {
  id: string                 // GID: gid://shopify/Article/12345
  handle: string
  title: string
  body: string               // HTML
  summary: string | null
  tags: string[]
  isPublished: boolean
  publishedAt: string | null
  onlineStoreUrl: string | null
  image: { url: string; altText: string | null } | null
  seo: { title: string | null; description: string | null } | null
}

export interface ShopifyArticleCreateInput {
  blogId: string             // GID
  title: string
  body: string               // HTML
  author?: { name: string }
  tags?: string[]
  summary?: string
  isPublished: boolean
  publishedAt?: string       // ISO8601 — future date = scheduled
  image?: { url: string; altText?: string }
  seo?: { title?: string; description?: string }
}

export interface ShopifyArticleUpdateInput {
  id: string                 // GID
  title?: string
  body?: string
  tags?: string[]
  summary?: string
  isPublished?: boolean
  publishedAt?: string
  image?: { url: string; altText?: string }
  seo?: { title?: string; description?: string }
}

export interface ShopifyGraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
  // requestId from Shopify's X-Request-Id — persist for support/debugging
  extensions?: { code?: string; requestId?: string }
}

export interface ShopifyUserError {
  field: string[] | null
  message: string
  code?: string
}
