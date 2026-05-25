import { redirect } from 'next/navigation'
import { Sidebar, MobileSidebarProvider } from '@/components/shell/sidebar'
import { TopNav } from '@/components/shell/top-nav'
import { QuickCaptureProvider } from '@/components/shell/quick-capture-provider'
import { GlobalNavShortcuts } from '@/components/shell/global-nav-shortcuts'
import { ErrorBoundary } from '@/components/shell/error-boundary'
import { getAuthenticatedUserId } from '@/lib/auth/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUserId()
  if (!user) redirect('/sign-in')

  return (
    <QuickCaptureProvider>
      <GlobalNavShortcuts />
      <MobileSidebarProvider>
        <div className="flex h-dvh overflow-hidden bg-zinc-50 text-[120%]">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNav />
            <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </MobileSidebarProvider>
    </QuickCaptureProvider>
  )
}
