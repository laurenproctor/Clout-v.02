import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shell/sidebar'
import { TopNav } from '@/components/shell/top-nav'
import { QuickCaptureProvider } from '@/components/shell/quick-capture-provider'
import { ErrorBoundary } from '@/components/shell/error-boundary'
import { getSession } from '@/lib/auth/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // User is authenticated (middleware ensures this) but has no workspace yet
  if (!session) {
    redirect('/onboarding')
  }

  return (
    <QuickCaptureProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-50">
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
