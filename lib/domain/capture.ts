import type {
  Capture,
  CreateCaptureInput,
  UpdateCaptureInput,
  DomainResult,
} from '@/types/domain'

export async function createCapture(
  input: CreateCaptureInput
): Promise<DomainResult<Capture>> {
  throw new Error('not implemented')
}

export async function getCaptureById(
  id: string
): Promise<DomainResult<Capture>> {
  throw new Error('not implemented')
}

export async function listCaptures(
  workspaceId: string,
  options?: { limit?: number; offset?: number; tags?: string[] }
): Promise<DomainResult<Capture[]>> {
  throw new Error('not implemented')
}

export async function updateCapture(
  id: string,
  input: UpdateCaptureInput
): Promise<DomainResult<Capture>> {
  throw new Error('not implemented')
}

export async function deleteCapture(
  id: string
): Promise<DomainResult<void>> {
  throw new Error('not implemented')
}

export async function processCapture(
  id: string
): Promise<DomainResult<Capture>> {
  throw new Error('not implemented')
}

export async function searchCaptures(
  workspaceId: string,
  query: string,
  options?: { limit?: number }
): Promise<DomainResult<Capture[]>> {
  throw new Error('not implemented')
}
