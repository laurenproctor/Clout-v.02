import { notFound, redirect } from 'next/navigation'
import { WorkspaceProvider } from '@/components/providers/workspace-provider'
import type { WorkspaceContextValue } from '@/components/providers/workspace-provider'
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

  // Try to find current workspace + membership in one query
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, plan, avatar_url, brand_color, deleted_at)')
    .eq('user_id', user.userId)
    .filter('workspaces.slug', 'eq', workspaceSlug)
    .filter('workspaces.deleted_at', 'is', null)
    .maybeSingle()

  if (!membership || !membership.workspaces) {
    // Check slug history — old slug → redirect to current slug
    const { data: history } = await supabase
      .from('workspace_slug_history')
      .select('workspace_id, workspaces(slug)')
      .eq('old_slug', workspaceSlug)
      .maybeSingle()

    if (history?.workspaces) {
      const currentSlug = (history.workspaces as { slug: string }).slug
      redirect(`/${currentSlug}/dashboard`)
    }

    notFound()
  }

  const ws = membership.workspaces as {
    id: string
    name: string
    slug: string
    plan: string
    avatar_url: string | null
    brand_color: string | null
    deleted_at: string | null
  }

  const workspace: WorkspaceContextValue = {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    plan: ws.plan as WorkspaceContextValue['plan'],
    avatarUrl: ws.avatar_url,
    brandColor: ws.brand_color,
    userRole: membership.role as WorkspaceContextValue['userRole'],
  }

  return (
    <WorkspaceProvider workspace={workspace}>
      {children}
    </WorkspaceProvider>
  )
}
