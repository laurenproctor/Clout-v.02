// app/(dashboard)/create/linkedin/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { LinkedInWorkspace } from '@/components/linkedin/LinkedInWorkspace'
import { IdentityBar } from '@/components/publishing/identity-bar'

export default async function LinkedInCreatePage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const lensesResult = await listLenses({ workspaceId: session.workspaceId })
  const lenses = lensesResult.ok ? lensesResult.data : []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-8 py-4">
        <h1 className="font-[Signifier] text-lg font-semibold text-zinc-900">LinkedIn Post</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          AI-assisted strategic publishing — frame, position, distribute.
        </p>
      </div>
      <div className="px-8 py-3 border-b border-zinc-100">
        <IdentityBar />
      </div>
      <div className="flex-1 min-h-0">
        <LinkedInWorkspace lenses={lenses} />
      </div>
    </div>
  )
}
