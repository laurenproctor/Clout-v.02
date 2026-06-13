'use client'

import { createContext, useContext } from 'react'

export type WorkspaceContextValue = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'business' | 'enterprise'
  avatarUrl: string | null
  brandColor: string | null
  userRole: 'owner' | 'admin' | 'editor' | 'viewer'
  timezone: string // workspace scheduling timezone (scheduling_preferences.timezone)
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: WorkspaceContextValue
  children: React.ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
