'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
  Rss,
  PanelLeft,
} from 'lucide-react'
import { SupportModal } from '@/components/shell/support-modal'
import { X } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Signal Feed', href: '/feed', icon: Rss },
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
  { label: 'Lenses', href: '/settings/lenses', icon: Layers },
  { label: 'Brand', href: '/settings/brand', icon: Palette },
  { label: 'Publishing', href: '/settings/publishing', icon: Send },
  { label: 'Schedule', href: '/settings/schedule', icon: CalendarClock },
  { label: 'Billing', href: '/settings/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings/workspace', icon: Settings },
]

const ADMIN_PATHS = ['/settings']

type MobileSidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  collapsed: boolean
  toggleCollapsed: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  toggleCollapsed: () => {},
})

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }, [])

  return (
    <MobileSidebarContext.Provider value={{ open, setOpen, collapsed, toggleCollapsed }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
  onClick,
}: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'flex items-center rounded-md py-2 text-sm transition-colors',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
          isActive
            ? 'bg-zinc-100 font-medium text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200',
            collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'
          )}
        >
          {label}
        </span>
      </Link>
      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity whitespace-nowrap group-hover:opacity-100">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
        </div>
      )}
    </div>
  )
}

function NavContent({
  onLinkClick,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  onLinkClick?: () => void
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const [supportOpen, setSupportOpen]         = useState(false)
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

  const toggleBtn = onToggleCollapse && (
    <button
      type="button"
      onClick={onToggleCollapse}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors shrink-0"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <PanelLeft
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          collapsed ? 'rotate-180' : ''
        )}
      />
    </button>
  )

  // ── Admin sidebar ──────────────────────────────────────────────────────────
  if (isAdminMode) {
    return (
      <>
        <div
          className={cn(
            'flex h-14 items-center border-b border-zinc-200 px-3 gap-2',
            collapsed ? 'justify-center' : ''
          )}
        >
          {toggleBtn}
          {!collapsed && (
            <>
              <Link
                href="/dashboard"
                onClick={onLinkClick}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
              <span className="text-sm font-semibold tracking-tight text-zinc-900">Admin</span>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {adminItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              label === 'Settings'
                ? pathname.startsWith('/settings') &&
                  !pathname.startsWith('/settings/brand') &&
                  !pathname.startsWith('/settings/publishing') &&
                  !pathname.startsWith('/settings/schedule') &&
                  !pathname.startsWith('/settings/lenses') &&
                  !pathname.startsWith('/settings/billing')
                : pathname === href || pathname.startsWith(href + '/')
            return (
              <NavItem
                key={href}
                href={href}
                icon={Icon}
                label={label}
                isActive={isActive}
                collapsed={!!collapsed}
                onClick={onLinkClick}
              />
            )
          })}
          <div className="group relative">
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className={cn(
                'flex w-full items-center rounded-md py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900',
                collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
              )}
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200',
                  collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'
                )}
              >
                Help
              </span>
            </button>
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity whitespace-nowrap group-hover:opacity-100">
                Help
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
              </div>
            )}
          </div>
        </nav>

        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} initialCategory={supportCategory} />
      </>
    )
  }

  // ── Main sidebar ───────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={cn(
          'flex h-14 items-center border-b border-zinc-200',
          collapsed ? 'justify-center px-3' : 'justify-between px-4'
        )}
      >
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-zinc-900">Clout</span>
        )}
        {toggleBtn}
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
            <NavItem
              key={href}
              href={href}
              icon={Icon}
              label={label}
              isActive={isActive}
              collapsed={!!collapsed}
              onClick={onLinkClick}
            />
          )
        })}
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-200',
            collapsed ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'
          )}
        >
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
        </div>
      </nav>

      <div className="p-2 pb-[env(safe-area-inset-bottom)]">
        <div className="group relative">
          <Link
            href="/settings/brand"
            onClick={onLinkClick}
            className={cn(
              'flex items-center rounded-md py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900',
              collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200',
                collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'
              )}
            >
              Admin
            </span>
            {!collapsed && <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-400" />}
          </Link>
          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity whitespace-nowrap group-hover:opacity-100">
              Admin
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function Sidebar() {
  const { open, setOpen, collapsed, toggleCollapsed } = useMobileSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex h-full shrink-0 flex-col border-r border-zinc-200 bg-white overflow-hidden transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[56px]' : 'w-[220px]'
        )}
      >
        <NavContent collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
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
