import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { listLenses } from '@/lib/domain/lens'
import { InstagramWorkspace } from '@/components/instagram/InstagramWorkspace'
import { IdentityBar } from '@/components/publishing/identity-bar'

export default async function InstagramCreatePage({
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
    .select('id, custom_audiences')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!workspace) notFound()

  const lensesResult = await listLenses({ workspaceId: workspace.id })
  const lenses = lensesResult.ok ? lensesResult.data : []

  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('logo_url')
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  const logoUrl = brand?.logo_url ?? null

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-8 py-4">
        <h1 className="font-[Signifier] text-lg font-semibold text-zinc-900">Instagram Post</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Visual-first publishing — format, render, distribute.
        </p>
      </div>
      <div className="px-8 py-3 border-b border-zinc-100">
        <IdentityBar />
      </div>
      <div className="flex-1 min-h-0">
        <InstagramWorkspace lenses={lenses} logoUrl={logoUrl} savedAudiences={workspace.custom_audiences ?? []} />
      </div>
    </div>
  )
}
