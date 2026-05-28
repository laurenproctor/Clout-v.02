import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { ImageCreator } from '@/components/create/image/ImageCreator'

export default async function ImageCreatePage({
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

  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('logo_url, primary_color, secondary_color, accent_color, font_heading, font_body')
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-8 py-4">
        <h1 className="font-[Signifier] text-lg font-semibold text-zinc-900">Create Image</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Generate brand-consistent social images and editorial visuals.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <ImageCreator
          workspaceId={workspace.id}
          logoUrl={brand?.logo_url ?? null}
          brandColors={{
            primary: brand?.primary_color ?? '#000000',
            secondary: brand?.secondary_color ?? '#ffffff',
            accent: brand?.accent_color ?? '#6366f1',
          }}
        />
      </div>
    </div>
  )
}
