import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/domain/contact', () => ({ createContactSubmission: vi.fn() }))
vi.mock('@/lib/email/resend', () => ({
  sendContactNotification: vi.fn(),
  sendContactAutoReply: vi.fn(),
}))

import { POST } from '@/app/api/contact/route'
import { createContactSubmission } from '@/lib/domain/contact'
import { sendContactNotification, sendContactAutoReply } from '@/lib/email/resend'

const mockCreate = vi.mocked(createContactSubmission)
const mockNotify = vi.mocked(sendContactNotification)
const mockAutoReply = vi.mocked(sendContactAutoReply)

const valid = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  message: 'Hello there',
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({ ok: true, data: { id: 'row-1' } })
  mockNotify.mockResolvedValue(undefined)
  mockAutoReply.mockResolvedValue(undefined)
})

describe('POST /api/contact', () => {
  it('stores the submission and sends both emails on success', async () => {
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockCreate).toHaveBeenCalledWith(valid)
    expect(mockNotify).toHaveBeenCalledWith(valid)
    expect(mockAutoReply).toHaveBeenCalledWith({ firstName: 'Jane', email: 'jane@example.com' })
  })

  it('silently accepts honeypot submissions without storing or emailing', async () => {
    const res = await POST(makeReq({ ...valid, company: 'Acme Bots' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
    expect(mockAutoReply).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid input', async () => {
    const res = await POST(makeReq({ ...valid, email: 'nope' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'A valid email is required' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 500 when the insert fails', async () => {
    mockCreate.mockResolvedValue({ ok: false, error: 'db down' })
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db down' })
  })

  it('still succeeds when an email send rejects', async () => {
    mockNotify.mockRejectedValue(new Error('resend down'))
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
