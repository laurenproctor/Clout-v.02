export class ExtractionError extends Error {
  readonly code = 'EXTRACTION_FAILED'

  constructor(reason: string) {
    super(`EXTRACTION_FAILED: ${reason}`)
    this.name = 'ExtractionError'
  }
}
