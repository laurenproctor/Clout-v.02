// lib/publishing/providers/shopify/client.ts
// Shopify Admin GraphQL API client.
// All mutations use the 2024-10 API version defined in oauth.ts.
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'
import { shopifyApiUrl } from './oauth'
import type {
  ShopifyShopInfo,
  ShopifyBlog,
  ShopifyArticle,
  ShopifyArticleCreateInput,
  ShopifyArticleUpdateInput,
  ShopifyGraphQLError,
  ShopifyUserError,
} from './types'

async function shopifyGql<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(shopifyApiUrl(shopDomain), {
    method: 'POST',
    headers: {
      'Content-Type':           'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  })

  // Shopify returns X-Request-Id on every response — capture for debugging
  const shopifyRequestId = res.headers.get('x-request-id') ?? undefined

  if (res.status === 401 || res.status === 403) {
    const err = new PublishingError(
      'Shopify authentication failed. Reconnect your store.',
      PUB_ERROR.AUTH_FAILED, false,
    )
    err.requestId      = shopifyRequestId
    err.retryCategory  = 'auth'
    throw err
  }
  if (res.status === 429) {
    const retryAfterSec = parseInt(res.headers.get('retry-after') ?? '60', 10)
    const err = new PublishingError('Shopify rate limit exceeded.', PUB_ERROR.RATE_LIMITED, true)
    err.requestId      = shopifyRequestId
    err.retryAfter     = retryAfterSec
    err.retryCategory  = 'rate_limit'
    throw err
  }
  if (!res.ok) {
    const err = new PublishingError(
      `Shopify API error (${res.status})`, PUB_ERROR.PUBLISH_FAILED, res.status >= 500,
    )
    err.requestId     = shopifyRequestId
    err.retryCategory = res.status >= 500 ? 'provider_outage' : 'validation'
    throw err
  }

  const body = await res.json() as { data?: T; errors?: ShopifyGraphQLError[] }

  if (body.errors?.length) {
    const msg        = body.errors.map(e => e.message).join('; ')
    const gqlCode    = body.errors[0]?.extensions?.code
    const gqlReqId   = body.errors[0]?.extensions?.requestId ?? shopifyRequestId
    const isAuth     = gqlCode === 'ACCESS_DENIED' || gqlCode === 'UNAUTHORIZED'
    const err        = new PublishingError(msg, isAuth ? PUB_ERROR.AUTH_FAILED : PUB_ERROR.PUBLISH_FAILED, !isAuth)
    err.providerCode  = gqlCode
    err.requestId     = gqlReqId
    err.retryCategory = isAuth ? 'auth' : 'validation'
    throw err
  }

  return body.data as T
}

function checkUserErrors(errors: ShopifyUserError[]): void {
  if (errors.length > 0) {
    const msg = errors.map(e => e.message).join('; ')
    const err = new PublishingError(msg, PUB_ERROR.MALFORMED_CONTENT, false)
    err.retryCategory = 'validation'
    throw err
  }
}

// ─── Shop info ────────────────────────────────────────────────────────────────

export async function getShopInfo(
  shopDomain: string,
  accessToken: string,
): Promise<ShopifyShopInfo> {
  const data = await shopifyGql<{ shop: ShopifyShopInfo }>(shopDomain, accessToken, `{
    shop {
      id
      name
      domain: myshopifyDomain
      myshopifyDomain
      primaryDomain { url }
      currencyCode
      timezoneAbbreviation
    }
  }`)
  return data.shop
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export async function listBlogs(
  shopDomain: string,
  accessToken: string,
): Promise<ShopifyBlog[]> {
  const data = await shopifyGql<{ blogs: { nodes: ShopifyBlog[] } }>(
    shopDomain, accessToken,
    `{ blogs(first: 50) { nodes { id handle title onlineStoreUrl } } }`,
  )
  return data.blogs.nodes
}

// ─── Articles ─────────────────────────────────────────────────────────────────

const ARTICLE_FIELDS = `
  id handle title body: bodyHtml summary tags isPublished publishedAt
  onlineStoreUrl
  image { url altText }
  seo { title description }
`

export async function createArticle(
  shopDomain: string,
  accessToken: string,
  input: ShopifyArticleCreateInput,
): Promise<ShopifyArticle> {
  const data = await shopifyGql<{
    articleCreate: { article: ShopifyArticle | null; userErrors: ShopifyUserError[] }
  }>(shopDomain, accessToken, `
    mutation articleCreate($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { ${ARTICLE_FIELDS} }
        userErrors { field message code }
      }
    }
  `, { article: input })

  checkUserErrors(data.articleCreate.userErrors)
  if (!data.articleCreate.article) {
    throw new PublishingError('Shopify did not return an article.', PUB_ERROR.PUBLISH_FAILED, false)
  }
  return data.articleCreate.article
}

export async function updateArticle(
  shopDomain: string,
  accessToken: string,
  input: ShopifyArticleUpdateInput,
): Promise<ShopifyArticle> {
  const data = await shopifyGql<{
    articleUpdate: { article: ShopifyArticle | null; userErrors: ShopifyUserError[] }
  }>(shopDomain, accessToken, `
    mutation articleUpdate($article: ArticleUpdateInput!) {
      articleUpdate(article: $article) {
        article { ${ARTICLE_FIELDS} }
        userErrors { field message code }
      }
    }
  `, { article: input })

  checkUserErrors(data.articleUpdate.userErrors)
  if (!data.articleUpdate.article) {
    throw new PublishingError('Shopify did not return the updated article.', PUB_ERROR.UPDATE_FAILED, false)
  }
  return data.articleUpdate.article
}

export async function deleteArticle(
  shopDomain: string,
  accessToken: string,
  articleId: string,
): Promise<void> {
  const data = await shopifyGql<{
    articleDelete: { deletedArticleId: string | null; userErrors: ShopifyUserError[] }
  }>(shopDomain, accessToken, `
    mutation articleDelete($id: ID!) {
      articleDelete(id: $id) {
        deletedArticleId
        userErrors { field message code }
      }
    }
  `, { id: articleId })

  checkUserErrors(data.articleDelete.userErrors)
}
