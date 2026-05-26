'use client'

import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useMobileSidebar } from '@/components/shell/sidebar'

function getPageTitle(pathname: string): string {
  const parts = pathname.split('/')
  // parts: ['', slug, page, ...sub]
  const page = parts[2]
  const sub = parts[3]

  if (page === 'settings') {
    const map: Record<string, string> = {
      workspace: 'General',
      brand: 'Brand Identity',
      publishing: 'Publishing',
      feed: 'Signal Feed',
      analytics: 'Intelligence',
      lenses: 'Lenses',
      team: 'Team',
      billing: 'Billing',
      schedule: 'Schedule',
      profile: 'Profile',
    }
    return map[sub] ?? 'Settings'
  }

  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    capture: 'Capture',
    studio: 'Studio',
    analytics: 'Analytics',
    billing: 'Billing',
    onboarding: 'Onboarding',
    feed: 'Signal Feed',
    calendar: 'Calendar',
    create: 'Create',
    analyze: 'Content Analyzer',
    syndicate: 'Syndicate',
    private: 'Private',
  }
  return map[page] ?? 'Clout'
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
          className="md:hidden rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
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
