import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { SignalFeed } from '@/components/feed/SignalFeed'

export const metadata = {
  title: 'Editorial Intelligence | Clout',
}

export default async function FeedPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const supabase = createServiceClient()
  const [{ data: userProfile }, { data: profile }, { data: feedSettings }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('onboarding_complete')
      .eq('id', session.userId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('display_name')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
    supabase
      .from('workspace_feed_settings')
      .select('workspace_id')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
  ])

  if (!feedSettings) {
    redirect(`/${workspaceSlug}/settings/feed?setup=1`)
  }

  return (
    <SignalFeed
      userId={session.userId}
      onboardingComplete={userProfile?.onboarding_complete ?? false}
      userDisplayName={(profile as { display_name?: string | null } | null)?.display_name ?? ''}
    />
  )
}
