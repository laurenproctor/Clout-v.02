'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Zap,
  Lock,
  PenSquare,
  Layers,
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
  ArrowLeft,
  ChevronRight,
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
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
]

const adminItems = [
  { label: 'Brand', href: '/settings/brand', icon: Palette },
  { label: 'Publishing', href: '/settings/publishing', icon: Send },
  { label: 'Schedule', href: '/schedule', icon: CalendarClock },
  { label: 'Lenses', href: '/lenses', icon: Layers },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings/workspace', icon: Settings },
]

const ADMIN_PATHS = ['/settings', '/schedule', '/billing', '/lenses']

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
  const [supportOpen, setSupportOpen]       = useState(false)
  const [supportCategory, setSupportCategory] = useState<'question' | 'bug' | 'feature' | 'billing' | 'call'>('question')

  useEffect(() => {
    function handler(e: Event) {
      const category = (e as CustomEvent<{ category: string }>).detail?.category
      setSupportCategory((category as typeof supportCategory) ?? 'question')
      setSupportOpen(true)
    }
    window.addEventListener('open-support', handler)
    return () => window.removeEventListener('open-support', handler)
  }, [])

  const isAdminMode = ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  // ── Admin sidebar ──────────────────────────────────────────────────────────
  if (isAdminMode) {
    return (
      <>
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 gap-3">
          <Link
            href="/dashboard"
            onClick={onLinkClick}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">Admin</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {adminItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              label === 'Settings'
                ? pathname.startsWith('/settings') &&
                  !pathname.startsWith('/settings/brand') &&
                  !pathname.startsWith('/settings/publishing')
                : pathname === href || pathname.startsWith(href + '/')
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
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            Help
          </button>
        </nav>

        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} initialCategory={supportCategory} />
      </>
    )
  }

  // ── Main sidebar ───────────────────────────────────────────────────────────
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
        <div className="mx-1 my-1 border-t border-zinc-200" />
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-zinc-300">
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-zinc-400">⌘K</kbd>
            {' '}Quick capture
          </p>
          <p className="mt-1.5 text-xs text-zinc-300">
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-zinc-400">G</kbd>
            {' + letter  '}Navigate
          </p>
        </div>
      </nav>

      <div className="p-2 pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/settings/brand"
          onClick={onLinkClick}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Admin
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-400" />
        </Link>
      </div>
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
        <SheetContent side="left" className="p-0 w-[min(280px,85vw)] flex flex-col [&>button]:hidden">
          <NavContent onLinkClick={() => setOpen(false)} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
