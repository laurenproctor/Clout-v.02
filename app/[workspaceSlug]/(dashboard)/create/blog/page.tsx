// app/[workspaceSlug]/(dashboard)/create/blog/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { listLenses } from '@/lib/domain/lens'
import { BlogWorkspace } from '@/components/blog/BlogWorkspace'

export default async function BlogCreatePage({
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

  const lensesResult = await listLenses({ workspaceId: workspace.id })
  const lenses = lensesResult.ok ? lensesResult.data : []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-8 py-4">
        <h1 className="font-[Signifier] text-lg font-semibold text-zinc-900">Blog Post</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Strategic narrative engineering — position, argue, write, distribute.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <BlogWorkspace lenses={lenses} workspaceId={workspace.id} />
      </div>
    </div>
  )
}
