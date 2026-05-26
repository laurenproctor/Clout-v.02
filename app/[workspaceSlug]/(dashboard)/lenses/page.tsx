import { redirect } from 'next/navigation'

export default async function LensesRedirect({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  redirect(`/${workspaceSlug}/settings/lenses`)
}
