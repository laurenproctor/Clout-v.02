import { PublishingError } from './errors'

export const RETRY_POLICY = {
  maxAttempts:       3,
  initialDelayMs:    2000,
  backoffMultiplier: 2,
  maxDelayMs:        30_000,
} as const

export function nextRetryDelayMs(attemptCount: number): number {
  const delay = RETRY_POLICY.initialDelayMs * Math.pow(RETRY_POLICY.backoffMultiplier, attemptCount)
  return Math.min(delay, RETRY_POLICY.maxDelayMs)
}

export function nextRetryAt(attemptCount: number): Date {
  return new Date(Date.now() + nextRetryDelayMs(attemptCount))
}

export function isRetryable(err: unknown): boolean {
  if (err instanceof PublishingError) return err.retryable
  const msg = err instanceof Error ? err.message : String(err)
  return /timeout|ECONNRESET|ENOTFOUND|network|429|5\d\d/i.test(msg)
}

export function shouldRetry(attemptCount: number, err: unknown): boolean {
  return attemptCount < RETRY_POLICY.maxAttempts && isRetryable(err)
}
