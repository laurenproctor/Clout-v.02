import { describe, it, expect } from 'vitest'
import { urlParts } from '../scrapers/types'
import { parseMbasicPosts } from '../scrapers/facebook'

describe('urlParts', () => {
  it('extracts path parts from full URL', () => {
    expect(urlParts('https://twitter.com/TechCrunch')).toEqual(['TechCrunch'])
  })

  it('works without protocol', () => {
    expect(urlParts('linkedin.com/company/stripe')).toEqual(['company', 'stripe'])
  })

  it('returns empty array for invalid URL', () => {
    expect(urlParts('not a url %%')).toEqual([])
  })

  it('filters empty segments', () => {
    expect(urlParts('https://youtube.com/@techcrunch')).toEqual(['@techcrunch'])
  })
})

describe('parseMbasicPosts', () => {
  it('returns empty array when no story permalinks exist', () => {
    expect(parseMbasicPosts('<html><body>nothing here</body></html>')).toEqual([])
  })

  it('extracts post_id and url from story permalink', () => {
    const html = `
      <p>Some post content that is definitely longer than twenty characters</p>
      <a href="/story.php?story_fbid=123456&amp;id=789">See full story</a>
    `
    const posts = parseMbasicPosts(html)
    expect(posts).toHaveLength(1)
    expect(posts[0].post_id).toBe('123456')
    expect(posts[0].url).toContain('story_fbid=123456')
  })

  it('parses reaction counts', () => {
    const html = `
      <p>Exciting announcement that is more than twenty characters long here</p>
      <span>42 people reacted</span>
      <a href="/story.php?story_fbid=999&amp;id=111">See full story</a>
      <span>7 comments</span>
    `
    const posts = parseMbasicPosts(html)
    expect(posts[0].likes).toBe(42)
    expect(posts[0].comments).toBe(7)
  })

  it('skips entries with no extractable text content', () => {
    const html = `<a href="/story.php?story_fbid=111&amp;id=222">See full story</a>`
    expect(parseMbasicPosts(html)).toHaveLength(0)
  })
})
