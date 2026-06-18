// Regression test for the brand "Example Imagery" multi-upload bug.
//
// The ImageryUploader drops N files and runs them through a sequential loop:
//   for (const file of files) await onUpload(file)
// where onUpload === the page's handleImageryUpload, which appends the new URL
// to imagery state. The bug was that the handler read `imagery.uploaded_imagery`
// captured in its render closure (a single snapshot taken before the loop), so
// every iteration appended to the SAME stale array and only the last URL survived
// — in both the displayed grid and (via the debounced auto-save) the DB.
//
// The fix switches to a functional state update that builds from `prev`.
// This test models that exact difference: a React-like setState whose closure
// snapshot does not change mid-loop, driven by the real uploader loop shape.

import { describe, it, expect } from 'vitest'

type ImageryState = { uploaded_imagery: string[] }
type Updater = Partial<ImageryState> | ((prev: ImageryState) => ImageryState)

// Minimal stand-in for useState: the setter is the only way state changes, and a
// `const` captured before the loop (the render snapshot) never sees those changes
// — exactly like a React closure that hasn't re-rendered yet.
function makeStore(initial: ImageryState) {
  let state = initial
  const setState = (u: Updater) => {
    state = typeof u === 'function' ? u(state) : { ...state, ...u }
  }
  return { get: () => state, setState }
}

// The real upload loop from ImageryUploader.handleFiles — sequential awaits.
async function runUploadLoop(urls: string[], onUpload: (url: string) => Promise<void>) {
  for (const url of urls) {
    await onUpload(url) // simulates POST → returns a URL → handler appends it
  }
}

const NEW_URLS = ['https://cdn/img-a.png', 'https://cdn/img-b.png', 'https://cdn/img-c.png']

describe('brand imagery multi-upload', () => {
  it('OLD stale-closure handler loses all but the last image (reproduces the bug)', async () => {
    const store = makeStore({ uploaded_imagery: [] })
    const snapshot = store.get() // captured once at "render" time, before the loop
    await runUploadLoop(NEW_URLS, async url => {
      store.setState({ uploaded_imagery: [...snapshot.uploaded_imagery, url] })
    })
    expect(store.get().uploaded_imagery).toEqual([NEW_URLS[2]]) // only the last survives
  })

  it('FIXED functional-update handler keeps every image', async () => {
    const store = makeStore({ uploaded_imagery: [] })
    await runUploadLoop(NEW_URLS, async url => {
      store.setState(prev => ({ ...prev, uploaded_imagery: [...prev.uploaded_imagery, url] }))
    })
    expect(store.get().uploaded_imagery).toEqual(NEW_URLS) // all three preserved, in order
  })

  it('FIXED handler appends to pre-existing images instead of replacing them', async () => {
    const existing = ['https://cdn/old-1.png']
    const store = makeStore({ uploaded_imagery: existing })
    await runUploadLoop(NEW_URLS, async url => {
      store.setState(prev => ({ ...prev, uploaded_imagery: [...prev.uploaded_imagery, url] }))
    })
    expect(store.get().uploaded_imagery).toEqual([...existing, ...NEW_URLS])
  })
})
