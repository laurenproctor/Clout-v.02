import { redirect } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export default async function RootPage() {
  const user = await getAuthenticatedUserId()
  if (!user) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (!member) redirect('/onboarding')

  const slug = (member.workspaces as { slug: string } | null)?.slug
  if (!slug) redirect('/onboarding')

  redirect(`/${slug}/dashboard`)
}
