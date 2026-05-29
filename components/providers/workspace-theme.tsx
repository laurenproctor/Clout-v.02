'use client'

import { useEffect } from 'react'
import { useWorkspace } from './workspace-provider'

export function WorkspaceTheme() {
  const { brandColor } = useWorkspace()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--workspace-accent', brandColor ?? '#18181b')
    document.body.classList.add('ws-themed')
    return () => {
      document.body.classList.remove('ws-themed')
    }
  }, [brandColor])

  return null
}
