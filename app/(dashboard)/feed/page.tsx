import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SignalFeed } from '@/components/feed/SignalFeed'

export const metadata = {
  title: 'Signal Feed | Clout',
}

export default async function FeedPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  return <SignalFeed userId={session.userId} />
}
