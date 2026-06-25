import { describe, it, expect } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LinkedInPreview } from '../renderers/LinkedInPreview'
import { previewFromStudioState } from '../adapters/fromStudioState'
import { parseAspectRatio } from '../core/spec'

const LANDSCAPE = parseAspectRatio('landscape', 'linkedin') // ≈ 1.9139

function renderLinkedIn(args: Parameters<typeof previewFromStudioState>[0]) {
  const data = previewFromStudioState(args)
  return renderToStaticMarkup(
    React.createElement(LinkedInPreview, { data, theme: 'light', density: 'standard' }),
  )
}

describe('LinkedInPreview rendering (regression for cropped overlay + missing loader)', () => {
  it('shows a "Creating image…" status + landscape skeleton while pending', () => {
    const html = renderLinkedIn({
      platform: 'linkedin',
      channel: null,
      body: 'The capsule is now the brand.',
      mediaPending: true,
    })

    // The loading indicator must be present and announced.
    expect(html).toContain('Creating image…')
    expect(html).toContain('role="status"')

    // The skeleton must occupy a landscape slot (≈1.914), not a 1:1 square.
    expect(html).toContain(`aspect-ratio:${LANDSCAPE}`)
    expect(html).not.toContain('aspect-ratio:1;')
  })

  it('renders an attached landscape image in a matching (uncropped) container', () => {
    const html = renderLinkedIn({
      platform: 'linkedin',
      channel: null,
      body: 'The capsule is now the brand.',
      media: [{ url: 'https://example.com/composed.png', aspectRatio: LANDSCAPE }],
    })

    // Container ratio matches the image ratio → object-fit: cover cannot crop it.
    expect(html).toContain(`aspect-ratio:${LANDSCAPE}`)
    expect(html).toContain('object-fit:cover')
    expect(html).toContain('composed.png')
    // No square container that would slice a 1.914 image in half.
    expect(html).not.toContain('aspect-ratio:1;')
  })
})
