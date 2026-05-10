import * as cheerio from 'cheerio'

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'form',
  'button',
  'nav',
  'header',
  'footer',
  'aside',
  'svg',
  // Tracking & ads
  '[data-ad]',
  '[data-advertisement]',
  '.ad',
  '.ads',
  '.advertisement',
  '.sponsored',
  // Newsletter/subscribe junk
  '.newsletter',
  '.subscribe',
  '.subscription',
  '[class*="subscribe"]',
  '[class*="newsletter"]',
  '[class*="signup"]',
  '[class*="sign-up"]',
  '[class*="paywall"]',
  // Tracking pixels
  'img[width="1"]',
  'img[height="1"]',
  // Social share bars
  '[class*="share-"]',
  '[class*="social-"]',
  // Hidden elements
  '[aria-hidden="true"]',
  '[style*="display:none"]',
  '[style*="display: none"]',
  '[style*="visibility:hidden"]',
]

// Substack-specific junk
const SUBSTACK_REMOVE = [
  '.subscription-widget-wrap',
  '.subscribe-widget',
  '.paywall',
  '.subscribe-prompt',
  '.post-footer',
  '.comments-section',
  '#comments',
  '.reactions',
  '.reaction-row',
  '.share-dialog',
  '.recommendations-scroll',
  '[class*="subscribe"]',
  '[class*="paywall"]',
  '[class*="comments"]',
  '[class*="reaction"]',
  '[class*="recommendations"]',
  '.footer',
  '.post-footer-cta',
]

export function sanitizeHtml(html: string, isSubstack = false): string {
  const $ = cheerio.load(html)

  // Remove noise elements
  for (const sel of REMOVE_SELECTORS) {
    $(sel).remove()
  }

  if (isSubstack) {
    for (const sel of SUBSTACK_REMOVE) {
      $(sel).remove()
    }
  }

  // Strip tracking attributes while preserving semantic ones
  $('*').each((_, el) => {
    if (el.type !== 'tag') return
    const keep = new Set(['href', 'src', 'alt', 'title', 'class', 'id', 'colspan', 'rowspan', 'type'])
    const attrs = Object.keys(el.attribs ?? {})
    for (const attr of attrs) {
      if (!keep.has(attr) || attr.startsWith('data-') || attr.startsWith('on')) {
        delete el.attribs[attr]
      }
    }
  })

  // Unwrap tracking spans/divs that add no semantic value
  $('span:not([class])').each((_, el) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(el).replaceWith($(el).html() ?? '')
  })

  return $.html()
}
