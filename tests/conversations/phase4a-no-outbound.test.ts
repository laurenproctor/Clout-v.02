import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

// Phase 4A is copy-only: Clout drafts, the user posts manually. These files must never
// reach the Unipile client or any outbound LinkedIn engagement helper — the boundary that
// keeps manual assisted engagement (4A) distinct from provider-posted engagement (4B).

const COPY_ONLY_FILES = [
  'app/api/conversations/opportunities/[id]/mark-posted/route.ts',
  'app/api/conversations/responses/route.ts',
]

const FORBIDDEN = [
  '@/lib/unipile/client', // no outbound provider client in the copy-only path
  'createComment',
  'addReaction',
  'createPost',
  'linkedin_engagement_actions', // reserved for 4B provider-posted only
]

describe('Phase 4A copy-only: no outbound engagement', () => {
  for (const file of COPY_ONLY_FILES) {
    it(`${file} makes no outbound LinkedIn engagement reference`, () => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const token of FORBIDDEN) {
        expect(src.includes(token), `${file} must not reference "${token}"`).toBe(false)
      }
    })
  }
})
