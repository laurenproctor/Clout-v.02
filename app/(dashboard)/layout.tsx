import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shell/sidebar'
import { TopNav } from '@/components/shell/top-nav'
import { QuickCaptureProvider } from '@/components/shell/quick-capture-provider'
import { ErrorBoundary } from '@/components/shell/error-boundary'
import { getSession, getAuthenticatedUserId } from '@/lib/auth/session'
import { createWorkspaceForUser } from '@/lib/domain/workspace'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session = await getSession()

  // Auto-provision a workspace so users can skip onboarding
  if (!session) {
    const user = await getAuthenticatedUserId()
    if (!user) redirect('/sign-in')
    await createWorkspaceForUser({ userId: user.userId, name: 'My Workspace' })
    session = await getSession()
    if (!session) redirect('/sign-in')
  }

  return (
    <QuickCaptureProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-50 text-[120%]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </QuickCaptureProvider>
  )
}
