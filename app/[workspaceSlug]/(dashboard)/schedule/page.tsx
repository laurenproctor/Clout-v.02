import { redirect } from 'next/navigation'

export default async function ScheduleRedirect({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  redirect(`/${workspaceSlug}/settings/schedule`)
}
