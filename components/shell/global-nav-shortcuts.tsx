'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'

export function GlobalNavShortcuts() {
  const router = useRouter()
  const { slug } = useWorkspace()
  const waitingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const navMap: Record<string, string> = {
      d: `/${slug}/dashboard`,
      i: `/${slug}/inbox`,
      q: `/${slug}/queue`,
      c: `/${slug}/capture`,
      w: `/${slug}/create`,
      s: `/${slug}/syndicate`,
      t: `/${slug}/studio`,
      a: `/${slug}/analytics`,
      l: `/${slug}/settings/lenses`,
    }

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

        const route = navMap[e.key.toLowerCase()]
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
  }, [router, slug])

  return null
}
