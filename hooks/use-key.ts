import { useEffect } from 'react'

interface UseKeyOptions {
  /** Skip attaching the listener entirely. Default: true (enabled). */
  enabled?: boolean
  /** Fire even when focus is inside an input/textarea/contenteditable. Default: false. */
  allowInInput?: boolean
}

/**
 * Attaches a keydown listener and calls `action` when `check` returns true.
 * Re-registers whenever `deps` change, matching the pattern used throughout the app.
 */
export function useKey(
  check: (e: KeyboardEvent) => boolean,
  action: (e: KeyboardEvent) => void,
  deps: React.DependencyList,
  opts: UseKeyOptions = {},
) {
  const { enabled = true, allowInInput = false } = opts

  useEffect(() => {
    if (!enabled) return

    function handler(e: KeyboardEvent) {
      if (!allowInInput) {
        const el = e.target as HTMLElement
        if (
          el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable
        ) return
      }
      if (check(e)) action(e)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // deps are passed through explicitly — suppressing exhaustive-deps is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, allowInInput, ...deps])
}
