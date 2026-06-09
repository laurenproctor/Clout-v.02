import { canonicalBodyToHtml } from './html'
import type { CanonicalNode } from '@/lib/publishing/canonical/types'

// Substack treats h1 as the post title — downgrade heading level 1 to 2.
// The canonicalizer already clamps headings to 2–4 so this is a defensive pass.
export function canonicalBodyToSubstackHtml(nodes: CanonicalNode[]): string {
  return canonicalBodyToHtml(nodes)
    .replace(/<h1([ >])/g, '<h2$1')
    .replace(/<\/h1>/g,    '</h2>')
}
