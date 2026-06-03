'use client'

import { useEffect } from 'react'
import { trackLastWorkspace } from '@/app/actions/workspace'

export function TrackLastWorkspace({ slug }: { slug: string }) {
  useEffect(() => {
    trackLastWorkspace(slug)
  }, [slug])

  return null
}
