import * as cheerio from 'cheerio'
import type { ExtractionResult } from './types'
import { ExtractionError } from './errors'

const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content-body',
  '.story-body',
  '.article-body',
  '.page-content',
  '#content',
  '.content',
]

const NOISE = [
  'script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside',
  'form', 'button', 'svg', 'iframe',
  '[role="complementary"]', '[role="navigation"]', '[role="banner"]',
  '[aria-hidden="true"]',
  '[class*="sidebar"]', '[class*="related"]', '[class*="recommend"]',
  '[class*="comment"]', '[class*="share"]', '[class*="social"]',
  '[class*="newsletter"]', '[class*="subscribe"]', '[class*="popup"]',
]

function og(html: string, prop: string): string | undefined {
  return new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']{1,300})["']`, 'i').exec(html)?.[1]
}

function metaName(html: string, name: string): string | undefined {
  return new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{1,300})["']`, 'i').exec(html)?.[1]
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractPageMeta(html: string): Pick<ExtractionResult, 'title' | 'author' | 'siteName' | 'publishedAt' | 'excerpt'> {
  const rawTitle =
    og(html, 'og:title') ??
    metaName(html, 'twitter:title') ??
    /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html)?.[1]?.split('|')[0]?.split('–')[0]?.trim() ??
    ''

  return {
    title: decodeEntities(rawTitle).trim(),
    author: og(html, 'article:author') ?? metaName(html, 'author'),
    siteName: og(html, 'og:site_name'),
    publishedAt: og(html, 'article:published_time'),
    excerpt: og(html, 'og:description') ?? metaName(html, 'description'),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of public signature, reserved for canonical-URL resolution
export async function extractWithReadability(html: string, _url: string): Promise<ExtractionResult> {
  const meta = extractPageMeta(html)
  const $ = cheerio.load(html)

  for (const sel of NOISE) {
    $(sel).remove()
  }

  let contentHtml = ''

  for (const sel of CONTENT_SELECTORS) {
    const el = $(sel).first()
    if (el.length === 0) continue
    const text = el.text().replace(/\s+/g, ' ').trim()
    if (text.length < 200) continue
    contentHtml = el.html() ?? ''
    break
  }

  // Fallback: body
  if (!contentHtml) {
    contentHtml = $('body').html() ?? ''
  }

  if (!contentHtml || contentHtml.trim().length < 100) {
    throw new ExtractionError('Could not extract readable content from page')
  }

  return { ...meta, html: contentHtml }
}
