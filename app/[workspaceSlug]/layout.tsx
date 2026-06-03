import { notFound, redirect } from 'next/navigation'
import { WorkspaceProvider } from '@/components/providers/workspace-provider'
import type { WorkspaceContextValue } from '@/components/providers/workspace-provider'
import { TrackLastWorkspace } from '@/components/shell/track-last-workspace'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

type Props = {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspaceSlug } = await params
  const user = await getAuthenticatedUserId()
  if (!user) redirect('/sign-in')

  const supabase = createServiceClient()

  // Look up workspace by slug
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, plan, avatar_url, brand_color')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!workspace) {
    // Check slug history — old slug → redirect to current slug
    const { data: history } = await supabase
      .from('workspace_slug_history')
      .select('workspaces(slug)')
      .eq('old_slug', workspaceSlug)
      .maybeSingle()

    if (history?.workspaces) {
      const currentSlug = (history.workspaces as { slug: string }).slug
      redirect(`/${currentSlug}/dashboard`)
    }

    notFound()
  }

  // Verify user is a member of this workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.userId)
    .maybeSingle()

  if (!member) notFound()

  const wsContext: WorkspaceContextValue = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan as WorkspaceContextValue['plan'],
    avatarUrl: workspace.avatar_url,
    brandColor: workspace.brand_color,
    userRole: member.role as WorkspaceContextValue['userRole'],
  }

  return (
    <WorkspaceProvider workspace={wsContext}>
      <TrackLastWorkspace slug={workspace.slug} />
      {children}
    </WorkspaceProvider>
  )
}
