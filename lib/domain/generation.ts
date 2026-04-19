import type {
  Generation,
  CreateGenerationInput,
  QualityScore,
  DomainResult,
} from '@/types/domain'

export async function createGeneration(
  input: CreateGenerationInput
): Promise<DomainResult<Generation>> {
  throw new Error('not implemented')
}

export async function getGenerationById(
  id: string
): Promise<DomainResult<Generation>> {
  throw new Error('not implemented')
}

export async function listGenerations(
  workspaceId: string,
  options?: { captureId?: string; lensId?: string; limit?: number; offset?: number }
): Promise<DomainResult<Generation[]>> {
  throw new Error('not implemented')
}

export async function runGeneration(
  id: string
): Promise<DomainResult<Generation>> {
  throw new Error('not implemented')
}

export async function evaluateQuality(
  output: string
): Promise<QualityScore> {
  return { score: 100, rationale: 'Evaluation not yet implemented', flags: [] }
}

export async function retryGeneration(
  id: string
): Promise<DomainResult<Generation>> {
  throw new Error('not implemented')
}

export async function cancelGeneration(
  id: string
): Promise<DomainResult<Generation>> {
  throw new Error('not implemented')
}
