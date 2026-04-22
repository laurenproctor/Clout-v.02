import { createServiceClient } from '@/lib/supabase/service'
import type { DomainResult } from '@/types/domain'

interface CreateSupportRequestParams {
  userId: string | null
  workspaceId: string | null
  category: string
  message: string
  screenshotUrl: string | null
  userEmail: string | null
  currentRoute: string | null
  browserInfo: string | null
}

export async function createSupportRequest(
  params: CreateSupportRequestParams
): Promise<DomainResult<{ id: string }>> {
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('support_requests')
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      category: params.category,
      message: params.message,
      screenshot_url: params.screenshotUrl,
      user_email: params.userEmail,
      current_route: params.currentRoute,
      browser_info: params.browserInfo,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: (error as { message: string }).message }
  return { ok: true, data: { id: (data as { id: string }).id } }
}
