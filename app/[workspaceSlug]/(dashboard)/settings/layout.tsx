'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { cn } from '@/lib/utils'

const settingsNav = (slug: string) => [
  { label: 'General', href: `/${slug}/settings/workspace` },
  { label: 'Brand Identity', href: `/${slug}/settings/brand` },
  { label: 'Publishing', href: `/${slug}/settings/publishing` },
  { label: 'Signal Intelligence', href: `/${slug}/settings/feed` },
  { label: 'Team', href: `/${slug}/settings/team` },
  { label: 'Billing', href: `/${slug}/settings/billing` },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useWorkspace()
  const pathname = usePathname()
  const nav = settingsNav(slug)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your workspace configuration.</p>
      </div>
      <div className="flex gap-8">
        <nav className="w-44 shrink-0 space-y-0.5">
          {nav.map(({ label, href }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-100 font-medium text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
