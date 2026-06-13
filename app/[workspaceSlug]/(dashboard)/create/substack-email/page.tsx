import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { listLenses } from '@/lib/domain/lens'
import { listConnections } from '@/lib/publishing/domain'
import { SubstackEmailWorkspace } from './SubstackEmailWorkspace'
import { IdentityBar } from '@/components/publishing/identity-bar'

// Substack Email creator. Intentionally NOT gated behind a feature flag or a Substack
// connection — generating and "Save to Studio" are always available. Publishing is gated
// downstream (capabilities endpoint + connection presence) on the secondary action.
export default async function SubstackEmailCreatePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const user = await getAuthenticatedUserId()
  if (!user) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!workspace) notFound()

  const [lensesResult, connectionsResult] = await Promise.all([
    listLenses({ workspaceId: workspace.id }),
    listConnections(workspace.id),
  ])

  const lenses              = lensesResult.ok ? lensesResult.data : []
  const allConnections      = connectionsResult.ok ? connectionsResult.data : []
  const substackConnections = allConnections.filter(c => c.provider === 'substack' && c.isActive)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-8 py-4">
        <div className="flex items-center gap-2">
          <h1 className="font-[Signifier] text-lg font-semibold text-zinc-900">Substack Email</h1>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Draft a long-form Substack email, then refine and schedule it in Studio.
        </p>
      </div>
      <div className="px-8 py-3 border-b border-zinc-100">
        <IdentityBar />
      </div>
      <div className="flex-1 min-h-0">
        <SubstackEmailWorkspace
          lenses={lenses}
          substackConnections={substackConnections}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  )
}
