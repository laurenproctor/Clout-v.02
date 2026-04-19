import type {
  Lens,
  CreateLensInput,
  UpdateLensInput,
  DomainResult,
} from '@/types/domain'

export async function createLens(
  input: CreateLensInput
): Promise<DomainResult<Lens>> {
  throw new Error('not implemented')
}

export async function getLensById(
  id: string
): Promise<DomainResult<Lens>> {
  throw new Error('not implemented')
}

export async function listLenses(
  workspaceId: string,
  options?: { limit?: number; offset?: number }
): Promise<DomainResult<Lens[]>> {
  throw new Error('not implemented')
}

export async function updateLens(
  id: string,
  input: UpdateLensInput
): Promise<DomainResult<Lens>> {
  throw new Error('not implemented')
}

export async function deleteLens(
  id: string
): Promise<DomainResult<void>> {
  throw new Error('not implemented')
}

export async function duplicateLens(
  id: string,
  workspaceId: string,
  userId: string
): Promise<DomainResult<Lens>> {
  throw new Error('not implemented')
}
