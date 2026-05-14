'use client'

import { createContext, useContext, useState } from 'react'
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
  Inbox,
  CalendarClock,
  ListOrdered,
  HelpCircle,
  Palette,
  Network,
  Share2,
  Sparkles,
  Send,
} from 'lucide-react'
import { SupportModal } from '@/components/shell/support-modal'
import { X } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Queue', href: '/queue', icon: ListOrdered },
  { label: 'Capture', href: '/capture', icon: Zap },
  { label: 'Create', href: '/create', icon: Sparkles },
  { label: 'Private', href: '/private', icon: Lock },
  { label: 'Content Analyzer', href: '/analyze', icon: Network },
  { label: 'Syndicate', href: '/syndicate', icon: Share2 },
  { label: 'Studio', href: '/studio', icon: PenSquare },
  { label: 'Schedule', href: '/schedule', icon: CalendarClock },
  { label: 'Lenses', href: '/lenses', icon: Layers },
  { label: 'Channels', href: '/channels', icon: Radio },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
]

type MobileSidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  open: false,
  setOpen: () => {},
})

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <MobileSidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}

function NavContent({ onLinkClick, onClose }: { onLinkClick?: () => void; onClose?: () => void }) {
  const pathname = usePathname()
  const [supportOpen, setSupportOpen] = useState(false)

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Clout</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
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

      <div className="border-t border-zinc-200 p-2 space-y-0.5">
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-zinc-300">
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-zinc-400">⌘K</kbd>
            {' '}Quick capture
          </p>
          <p className="text-xs text-zinc-300">
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-zinc-400">G</kbd>
            {' + letter  '}Navigate
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          Help
        </button>
        <Link
          href="/settings/brand"
          onClick={onLinkClick}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/settings/brand')
              ? 'bg-zinc-100 font-medium text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          )}
        >
          <Palette className="h-4 w-4 shrink-0" />
          Brand
        </Link>
        <Link
          href="/settings/publishing"
          onClick={onLinkClick}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/settings/publishing')
              ? 'bg-zinc-100 font-medium text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          )}
        >
          <Send className="h-4 w-4 shrink-0" />
          Publishing
        </Link>
        <Link
          href="/settings/workspace"
          onClick={onLinkClick}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/settings') && !pathname.startsWith('/settings/publishing') && !pathname.startsWith('/settings/brand')
              ? 'bg-zinc-100 font-medium text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  )
}

export function Sidebar() {
  const { open, setOpen } = useMobileSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-full w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-white">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[220px] flex flex-col [&>button]:hidden">
          <NavContent onLinkClick={() => setOpen(false)} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
