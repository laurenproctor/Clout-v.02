import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Resend } from 'resend'
import { renderText, renderHtml } from '@/lib/email/templates/contact-received'
import { sendContactNotification, sendContactAutoReply } from '@/lib/email/resend'

vi.mock('resend', () => ({ Resend: vi.fn() }))

const send = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'test-key'
  send.mockResolvedValue({ data: { id: 'eml_1' }, error: null })
  vi.mocked(Resend).mockImplementation(class { emails = { send } } as never)
})

describe('contact-received template', () => {
  it('renderText includes the first name', () => {
    expect(renderText({ firstName: 'Jane' })).toContain('Jane')
  })

  it('renderHtml includes the first name', async () => {
    const html = await renderHtml({ firstName: 'Jane' })
    expect(html).toContain('Jane')
  })
})

describe('sendContactNotification', () => {
  it('emails the Clout inbox with the submitter as reply-to', async () => {
    await sendContactNotification({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      message: 'Hello',
    })
    expect(send).toHaveBeenCalledTimes(1)
    const arg = send.mock.calls[0][0]
    expect(arg.to).toBe('hi@clout.you')
    expect(arg.from).toContain('clout.so')
    expect(arg.replyTo).toBe('jane@example.com')
    expect(arg.text).toContain('Hello')
  })

  it('throws when Resend returns an error', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'bad' } })
    await expect(
      sendContactNotification({ firstName: 'J', lastName: 'D', email: 'j@e.com', message: 'x' })
    ).rejects.toThrow('bad')
  })
})

describe('sendContactAutoReply', () => {
  it('emails the submitter the rendered template', async () => {
    await sendContactAutoReply({ firstName: 'Jane', email: 'jane@example.com' })
    const arg = send.mock.calls[0][0]
    expect(arg.to).toBe('jane@example.com')
    expect(arg.from).toContain('clout.so')
    expect(arg.html).toContain('Jane')
  })
})
