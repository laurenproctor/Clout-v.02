export interface ContactInput {
  firstName: string
  lastName: string
  email: string
  message: string
}

export type ValidateResult =
  | { ok: true; value: ContactInput }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_NAME = 200
const MAX_EMAIL = 320
const MAX_MESSAGE = 5000

function asObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isHoneypotTripped(body: unknown): boolean {
  const b = asObject(body)
  return b ? str(b.company).length > 0 : false
}

export function parseContactInput(body: unknown): ValidateResult {
  const b = asObject(body)
  if (!b) return { ok: false, error: 'Invalid request body' }

  const firstName = str(b.firstName)
  const lastName = str(b.lastName)
  const email = str(b.email)
  const message = str(b.message)

  if (!firstName) return { ok: false, error: 'First name is required' }
  if (!lastName) return { ok: false, error: 'Last name is required' }
  if (!email) return { ok: false, error: 'Email is required' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' }
  if (!message) return { ok: false, error: 'Message is required' }

  if (firstName.length > MAX_NAME) return { ok: false, error: 'First name is too long' }
  if (lastName.length > MAX_NAME) return { ok: false, error: 'Last name is too long' }
  if (email.length > MAX_EMAIL) return { ok: false, error: 'Email is too long' }
  if (message.length > MAX_MESSAGE) return { ok: false, error: 'Message is too long' }

  return { ok: true, value: { firstName, lastName, email, message } }
}
