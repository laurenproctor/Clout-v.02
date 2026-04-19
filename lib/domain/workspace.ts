import type {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  DomainResult,
  WorkspaceRole,
} from '@/types/domain'

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}

export async function getWorkspaceById(
  id: string
): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}

export async function getWorkspaceBySlug(
  slug: string
): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}

export async function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput
): Promise<DomainResult<Workspace>> {
  throw new Error('not implemented')
}

export async function deleteWorkspace(
  id: string
): Promise<DomainResult<void>> {
  throw new Error('not implemented')
}

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<DomainResult<WorkspaceMember[]>> {
  throw new Error('not implemented')
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<DomainResult<WorkspaceMember>> {
  throw new Error('not implemented')
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<DomainResult<void>> {
  throw new Error('not implemented')
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<DomainResult<WorkspaceMember>> {
  throw new Error('not implemented')
}
