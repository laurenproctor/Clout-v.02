'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const NAV_MAP: Record<string, string> = {
  d: '/dashboard',
  i: '/inbox',
  q: '/queue',
  c: '/capture',
  w: '/create',
  s: '/syndicate',
  t: '/studio',
  a: '/analytics',
  l: '/lenses',
}

export function GlobalNavShortcuts() {
  const router = useRouter()
  const waitingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Never fire inside inputs or with modifier keys
      const el = e.target as HTMLElement
      if (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable
      ) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (waitingRef.current) {
        // Second key: attempt navigation
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        waitingRef.current = false

        const route = NAV_MAP[e.key.toLowerCase()]
        if (route) {
          e.preventDefault()
          router.push(route)
        }
        return
      }

      if (e.key === 'g' || e.key === 'G') {
        waitingRef.current = true
        timeoutRef.current = setTimeout(() => {
          waitingRef.current = false
        }, 1500)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [router])

  return null
}
