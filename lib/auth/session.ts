import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/db'

export interface AuthSession {
  clerkId: string
  userId: string       // internal UUID from users table
  workspaceId: string  // first workspace the user belongs to
}

// Lighter auth check — only needs user row, no workspace required.
// Used for the onboarding workspace-creation step.
export async function getAuthenticatedUserId(): Promise<{ clerkId: string; userId: string } | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  const supabase = await createClient()
  const { data: user } = (await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()) as { data: { id: string } | null }
  if (!user) return null
  return { clerkId, userId: user.id }
}

export async function getSession(): Promise<AuthSession | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const supabase = await createClient()

  // Look up internal user by Clerk ID
  const { data: user } = (await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()) as { data: { id: string } | null }

  if (!user) return null

  // Look up the user's workspace (v1: one workspace per user)
  const { data: member } = (await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()) as { data: { workspace_id: string } | null }

  if (!member) return null

  return {
    clerkId,
    userId: user.id,
    workspaceId: member.workspace_id,
  }
}
