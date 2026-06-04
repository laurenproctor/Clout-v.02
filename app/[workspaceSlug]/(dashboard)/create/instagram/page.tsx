// app/[workspaceSlug]/(dashboard)/create/instagram/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

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
    .select('id')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!workspace) notFound()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-8 py-4">
        <h1 className="font-[Signifier] text-lg font-semibold text-zinc-900">Instagram Post</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Platform-native content — captions, carousels, and visual assets.
        </p>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Instagram creator coming soon.</p>
      </div>
    </div>
  )
}
