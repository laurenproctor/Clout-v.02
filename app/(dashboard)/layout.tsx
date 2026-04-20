import { Sidebar } from '@/components/shell/sidebar'
import { TopNav } from '@/components/shell/top-nav'
import { QuickCaptureProvider } from '@/components/shell/quick-capture-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuickCaptureProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </QuickCaptureProvider>
  )
}
