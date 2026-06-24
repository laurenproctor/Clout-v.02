import { describe, it, expect } from 'vitest'
import { parseContactInput, isHoneypotTripped } from '@/lib/contact/validate'

const valid = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  message: 'Hello there',
}

describe('parseContactInput', () => {
  it('accepts and trims valid input', () => {
    const r = parseContactInput({
      firstName: '  Jane ',
      lastName: ' Doe ',
      email: ' jane@example.com ',
      message: '  Hello there  ',
    })
    expect(r).toEqual({ ok: true, value: valid })
  })

  it('rejects a non-object body', () => {
    expect(parseContactInput(null)).toEqual({ ok: false, error: 'Invalid request body' })
    expect(parseContactInput('nope')).toEqual({ ok: false, error: 'Invalid request body' })
  })

  it('rejects a missing first name', () => {
    expect(parseContactInput({ ...valid, firstName: '   ' })).toEqual({
      ok: false,
      error: 'First name is required',
    })
  })

  it('rejects a missing last name', () => {
    expect(parseContactInput({ ...valid, lastName: '' })).toEqual({
      ok: false,
      error: 'Last name is required',
    })
  })

  it('rejects a missing email', () => {
    expect(parseContactInput({ ...valid, email: '' })).toEqual({
      ok: false,
      error: 'Email is required',
    })
  })

  it('rejects a malformed email', () => {
    expect(parseContactInput({ ...valid, email: 'not-an-email' })).toEqual({
      ok: false,
      error: 'A valid email is required',
    })
  })

  it('rejects a missing message', () => {
    expect(parseContactInput({ ...valid, message: '  ' })).toEqual({
      ok: false,
      error: 'Message is required',
    })
  })
})

describe('isHoneypotTripped', () => {
  it('is false when company is absent or empty', () => {
    expect(isHoneypotTripped(valid)).toBe(false)
    expect(isHoneypotTripped({ ...valid, company: '   ' })).toBe(false)
    expect(isHoneypotTripped(null)).toBe(false)
  })

  it('is true when company is filled', () => {
    expect(isHoneypotTripped({ ...valid, company: 'Acme Bots' })).toBe(true)
  })
})
