import { getSession } from '@/lib/auth/session'
import { SyndicationClient } from './SyndicationClient'
import { redirect } from 'next/navigation'

export default async function SyndicationPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  return <SyndicationClient />
}
