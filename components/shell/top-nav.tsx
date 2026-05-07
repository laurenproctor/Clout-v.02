'use client'

import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useMobileSidebar } from '@/components/shell/sidebar'

function getPageTitle(pathname: string): string {
  const segment = pathname.split('/')[1]
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    capture: 'Capture',
    studio: 'Studio',
    lenses: 'Lenses',
    channels: 'Channels',
    analytics: 'Analytics',
    billing: 'Billing',
    settings: 'Settings',
    onboarding: 'Onboarding',
  }
  return titles[segment] ?? 'Clout'
}

export function TopNav() {
  const pathname = usePathname()
  const { setOpen } = useMobileSidebar()
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="md:hidden rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-zinc-900">{getPageTitle(pathname)}</span>
      </div>
      <UserButton />
    </header>
  )
}
