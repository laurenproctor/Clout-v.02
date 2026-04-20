import { createClient } from '@/lib/supabase/server'
import type {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  DomainResult,
  WorkspaceRole,
} from '@/types/domain'

// Creates a workspace, adds the creator as owner, creates an empty profile.
// Called from onboarding after the user's Clerk session is established.
export async function createWorkspaceForUser(params: {
  userId: string
  name: string
}): Promise<DomainResult<{ workspace: Workspace; memberId: string }>> {
  const supabase = await createClient()

  // Generate a URL-safe slug from the workspace name
  const slug =
    params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) +
    '-' +
    Math.random().toString(36).slice(2, 7)

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name: params.name, slug })
    .select()
    .single()

  if (wsError || !workspace) {
    return { ok: false, error: wsError?.message ?? 'Failed to create workspace' }
  }

  // Add creator as owner
  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: params.userId,
    role: 'owner',
  })

  if (memberError) {
    return { ok: false, error: memberError.message }
  }

  // Create empty profile for the workspace
  await supabase.from('profiles').insert({ workspace_id: workspace.id })

  return {
    ok: true,
    data: {
      workspace: {
        id: workspace.id as string,
        name: workspace.name as string,
        slug: workspace.slug as string,
        plan: workspace.plan as Workspace['plan'],
        assignedOperatorId: workspace.assigned_operator_id as string | null,
        createdAt: workspace.created_at as string,
        updatedAt: workspace.updated_at as string,
      },
      memberId: params.userId,
    },
  }
}

export async function updateProfile(params: {
  workspaceId: string
  displayName?: string
  bio?: string
  privateFeedOperatorVisible?: boolean
}): Promise<DomainResult<void>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(params.displayName !== undefined && { display_name: params.displayName }),
      ...(params.bio !== undefined && { bio: params.bio }),
      ...(params.privateFeedOperatorVisible !== undefined && {
        private_feed_operator_visible: params.privateFeedOperatorVisible,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', params.workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

// Remaining stubs
export async function getWorkspaceById(id: string): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}
export async function getWorkspaceBySlug(slug: string): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}
export async function updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}
export async function listWorkspaceMembers(workspaceId: string): Promise<DomainResult<WorkspaceMember[]>> {
  throw new Error('not implemented')
}
export async function addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<DomainResult<WorkspaceMember>> {
  throw new Error('not implemented')
}
export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<DomainResult<void>> {
  throw new Error('not implemented')
}
