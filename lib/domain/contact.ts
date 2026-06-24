import { createServiceClient } from '@/lib/supabase/service'
import type { DomainResult } from '@/types/domain'

interface CreateContactSubmissionParams {
  firstName: string
  lastName: string
  email: string
  message: string
}

export async function createContactSubmission(
  params: CreateContactSubmissionParams
): Promise<DomainResult<{ id: string }>> {
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contact_submissions')
    .insert({
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      message: params.message,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: (error as { message: string }).message }
  return { ok: true, data: { id: (data as { id: string }).id } }
}
