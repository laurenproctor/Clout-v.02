// tests/content/outputArtifact.test.ts
// Unit tests for Studio artifact labeling + the image-draft product state.
// These back the acceptance criteria: Substack Articles read as "Substack Article"
// (while keeping content_type stable), and image drafts are gated until they have a
// caption and a channel.
import { describe, it, expect } from 'vitest'
import { getArtifactLabel, isImageDraft, isImageDraftPublishable } from '@/lib/content/outputArtifact'

describe('getArtifactLabel', () => {
  it('labels a Substack Article distinctly via substackFormat (content_type unchanged)', () => {
    expect(getArtifactLabel({ contentType: 'substack-newsletter', content: { substackFormat: 'article' } }))
      .toBe('Substack Article')
  })

  it('labels a plain substack-newsletter as Substack Email', () => {
    expect(getArtifactLabel({ contentType: 'substack-newsletter' })).toBe('Substack Email')
    expect(getArtifactLabel({ contentType: 'substack-newsletter', content: { substackFormat: 'newsletter' } }))
      .toBe('Substack Email')
  })

  it('labels image drafts', () => {
    expect(getArtifactLabel({ contentType: 'image' })).toBe('Image draft')
  })

  it('labels known platform types', () => {
    expect(getArtifactLabel({ contentType: 'linkedin' })).toBe('LinkedIn')
    expect(getArtifactLabel({ contentType: 'instagram' })).toBe('Instagram')
    expect(getArtifactLabel({ contentType: 'threads' })).toBe('Threads')
    expect(getArtifactLabel({ contentType: 'blog' })).toBe('Blog Post')
    expect(getArtifactLabel({ contentType: 'substack-note' })).toBe('Note')
  })

  it('humanizes unknown tokens rather than showing a raw slug', () => {
    expect(getArtifactLabel({ contentType: 'authority' })).toBe('Authority')
    expect(getArtifactLabel({ contentType: 'some-new_type' })).toBe('Some New Type')
  })

  it('falls back to Draft when content_type is missing', () => {
    expect(getArtifactLabel({})).toBe('Draft')
    expect(getArtifactLabel({ contentType: null })).toBe('Draft')
  })
})

describe('isImageDraft', () => {
  it('is true only for content_type image', () => {
    expect(isImageDraft({ contentType: 'image' })).toBe(true)
    expect(isImageDraft({ contentType: 'linkedin' })).toBe(false)
    expect(isImageDraft({})).toBe(false)
  })
})

describe('isImageDraftPublishable', () => {
  it('requires both a caption/body and a channel', () => {
    expect(isImageDraftPublishable('A caption', 'chan-1')).toBe(true)
    expect(isImageDraftPublishable('', 'chan-1')).toBe(false)
    expect(isImageDraftPublishable('   ', 'chan-1')).toBe(false)
    expect(isImageDraftPublishable('A caption', null)).toBe(false)
    expect(isImageDraftPublishable('A caption', undefined)).toBe(false)
    expect(isImageDraftPublishable('', null)).toBe(false)
  })
})
