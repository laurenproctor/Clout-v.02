import { redirect } from 'next/navigation'

export default async function BillingRedirect({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  redirect(`/${workspaceSlug}/settings/billing`)
}
