import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

// Phase 3 is read-only. This guard fails if any Phase-3 monitoring source file gains a
// reference to (or import of) an outbound LinkedIn engagement helper — the tripwire
// against Phase 4 creep slipping into the monitoring path.
//
// Exact-token scanning prevents outbound LinkedIn engagement helpers from entering Phase 3
// without blocking legitimate read-only fields such as comment_counter or reaction_counter.
// (Case-sensitive: e.g. `listPostComments` contains `PostComment` but NOT the forbidden
// lowercase `postComment`, so it is correctly allowed.)

const PHASE3_FILES = [
  'lib/unipile/client.ts',
  'lib/conversations/providers/linkedin-unipile.ts',
  'app/api/conversations/sources/route.ts',
]

const FORBIDDEN_OUTBOUND_TOKENS = [
  'createComment',
  'addReaction',
  'createPost',
  'publishPost',
  'postComment',
  'sendComment',
]

describe('Phase 3 read-only: no outbound engagement helpers', () => {
  for (const file of PHASE3_FILES) {
    it(`${file} contains no outbound engagement identifiers`, () => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const token of FORBIDDEN_OUTBOUND_TOKENS) {
        expect(src.includes(token), `${file} must not reference outbound helper "${token}"`).toBe(false)
      }
    })
  }
})
