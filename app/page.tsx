import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export default async function RootPage() {
  const user = await getAuthenticatedUserId()
  if (!user) redirect('/sign-in')

  const supabase = createServiceClient()
  const jar = await cookies()
  const lastSlug = jar.get('last-workspace')?.value

  if (lastSlug) {
    // Verify the user is still a member of the last workspace before redirecting
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, slug')
      .eq('slug', lastSlug)
      .is('deleted_at', null)
      .maybeSingle()

    if (workspace) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.userId)
        .maybeSingle()

      if (member) redirect(`/${workspace.slug}/dashboard`)
    }
  }

  // Fallback: first workspace the user joined
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const slug = (membership.workspaces as { slug: string } | null)?.slug
  if (!slug) redirect('/onboarding')

  redirect(`/${slug}/dashboard`)
}
