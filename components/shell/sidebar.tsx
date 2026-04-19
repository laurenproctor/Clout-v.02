'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Zap,
  Lock,
  PenSquare,
  Layers,
  Radio,
  BarChart2,
  CreditCard,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Capture', href: '/capture', icon: Zap },
  { label: 'Private', href: '/private', icon: Lock },
  { label: 'Studio', href: '/studio', icon: PenSquare },
  { label: 'Lenses', href: '/lenses', icon: Layers },
  { label: 'Channels', href: '/channels', icon: Radio },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-200 px-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Clout</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-zinc-100 font-medium text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: settings */}
      <div className="border-t border-zinc-200 p-2">
        <Link
          href="/settings/workspace"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-zinc-100 font-medium text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
