// app/(dashboard)/create/blog/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { BlogWorkspace } from '@/components/blog/BlogWorkspace'

export default async function BlogCreatePage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const lensesResult = await listLenses({ workspaceId: session.workspaceId })
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
        <BlogWorkspace lenses={lenses} />
      </div>
    </div>
  )
}
