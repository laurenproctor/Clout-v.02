import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { createContactSubmission } from '@/lib/domain/contact'

const mockCreateServiceClient = vi.mocked(createServiceClient)

function buildClient(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const from = vi.fn(() => ({ insert }))
  return { client: { from } as unknown, insert }
}

const params = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', message: 'Hi' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createContactSubmission', () => {
  it('inserts snake_case columns and returns the new id', async () => {
    const { client, insert } = buildClient({ data: { id: 'abc-123' }, error: null })
    mockCreateServiceClient.mockReturnValue(client as never)

    const result = await createContactSubmission(params)

    expect(insert).toHaveBeenCalledWith({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      message: 'Hi',
    })
    expect(result).toEqual({ ok: true, data: { id: 'abc-123' } })
  })

  it('returns the error message when the insert fails', async () => {
    const { client } = buildClient({ data: null, error: { message: 'boom' } })
    mockCreateServiceClient.mockReturnValue(client as never)

    const result = await createContactSubmission(params)

    expect(result).toEqual({ ok: false, error: 'boom' })
  })
})
