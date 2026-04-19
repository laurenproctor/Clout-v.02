'use client'

import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

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
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <span className="text-sm font-medium text-zinc-900">{getPageTitle(pathname)}</span>
      <UserButton />
    </header>
  )
}
