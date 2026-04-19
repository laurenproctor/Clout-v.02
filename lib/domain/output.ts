import type {
  Output,
  PublishOutputInput,
  DomainResult,
} from '@/types/domain'

export async function getOutputById(
  id: string
): Promise<DomainResult<Output>> {
  throw new Error('not implemented')
}

export async function listOutputs(
  workspaceId: string,
  options?: { generationId?: string; limit?: number; offset?: number }
): Promise<DomainResult<Output[]>> {
  throw new Error('not implemented')
}

export async function publishOutput(
  input: PublishOutputInput
): Promise<DomainResult<Output>> {
  throw new Error('not implemented')
}

export async function unpublishOutput(
  id: string
): Promise<DomainResult<Output>> {
  throw new Error('not implemented')
}

export async function deleteOutput(
  id: string
): Promise<DomainResult<void>> {
  throw new Error('not implemented')
}

export async function updateOutputContent(
  id: string,
  content: string
): Promise<DomainResult<Output>> {
  throw new Error('not implemented')
}
