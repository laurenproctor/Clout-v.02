'use client'

import type { Lens } from '@/types/domain'

interface LinkedInWorkspaceProps {
  lenses: Lens[]
}

export function LinkedInWorkspace({ lenses: _lenses }: LinkedInWorkspaceProps) {
  return (
    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
      LinkedIn Post creation coming soon.
    </div>
  )
}
