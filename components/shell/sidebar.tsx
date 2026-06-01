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
  Link2,
  Settings,
  CalendarDays,
  CalendarClock,
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
  Activity,
  Newspaper,
  Users,
} from 'lucide-react'
import { SupportModal } from '@/components/shell/support-modal'
import { X } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { WorkspaceSwitcher } from '@/components/shell/workspace-switcher'
import { useWorkspace } from '@/components/providers/workspace-provider'

const navItems = (slug: string) => [
  { label: 'Dashboard', href: `/${slug}/dashboard`, icon: LayoutDashboard },
  { label: 'Signal Feed', href: `/${slug}/feed`, icon: Rss },
  { label: 'Calendar', href: `/${slug}/calendar`, icon: CalendarDays },
  { label: 'Capture', href: `/${slug}/capture`, icon: Zap },
  { label: 'Create', href: `/${slug}/create`, icon: Sparkles },
  { label: 'Private', href: `/${slug}/private`, icon: Lock },
  { label: 'Content Analyzer', href: `/${slug}/analyze`, icon: Network },
  { label: 'Syndicate', href: `/${slug}/syndicate`, icon: Share2 },
  { label: 'Studio', href: `/${slug}/studio`, icon: PenSquare },
  { label: 'Analytics', href: `/${slug}/analytics`, icon: BarChart2 },
  { label: 'Monitoring', href: '', icon: Activity, comingSoon: true },
  { label: 'Press', href: '', icon: Newspaper, comingSoon: true },
]

const adminItems = (slug: string) => [
  { label: 'Lenses', href: `/${slug}/settings/lenses`, icon: Layers },
  { label: 'Brand', href: `/${slug}/settings/brand`, icon: Palette },
  { label: 'Publishing', href: `/${slug}/settings/publishing`, icon: Send },
  { label: 'Signal Feed', href: `/${slug}/settings/feed`, icon: Rss },
  { label: 'Intelligence', href: `/${slug}/settings/analytics`, icon: BarChart2 },
  { label: 'Attribution', href: `/${slug}/settings/utm`, icon: Link2 },
  { label: 'Schedule', href: `/${slug}/settings/schedule`, icon: CalendarClock },
  { label: 'Team', href: `/${slug}/settings/team`, icon: Users },
  { label: 'Billing', href: `/${slug}/settings/billing`, icon: CreditCard },
  { label: 'Settings', href: `/${slug}/settings/workspace`, icon: Settings },
]

function isAdminPath(pathname: string) {
  // Extract everything after the slug: /slug/settings/brand → /settings/brand
  const afterSlug = '/' + pathname.split('/').slice(2).join('/')
  return afterSlug.startsWith('/settings')
}

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
  comingSoon,
}: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
  collapsed: boolean
  onClick?: () => void
  comingSoon?: boolean
}) {
  if (comingSoon) {
    return (
      <div className="group relative">
        <div
          className={cn(
            'flex items-center rounded-md py-2 text-sm cursor-default',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
            'text-zinc-300'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 flex items-center gap-1.5',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'
            )}
          >
            {label}
            <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-300 bg-zinc-100 rounded px-1 py-0.5 leading-none">
              Soon
            </span>
          </span>
        </div>
        {collapsed && (
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity whitespace-nowrap group-hover:opacity-100">
            {label} — coming soon
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
          </div>
        )}
      </div>
    )
  }

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
  const { slug } = useWorkspace()
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

  const isAdminMode = isAdminPath(pathname)

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
        {/* Workspace switcher row — mirrors main sidebar so workspace is always visible */}
        <div className="border-b border-zinc-200 px-2 py-2">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <WorkspaceSwitcher />
              </div>
              {toggleBtn}
            </div>
          ) : (
            <div className="flex justify-center">{toggleBtn}</div>
          )}
        </div>

        {/* Back to workspace + Admin label — hidden when collapsed */}
        {!collapsed && (
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2">
            <Link
              href={`/${slug}/dashboard`}
              onClick={onLinkClick}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Link>
            <span className="text-zinc-300">·</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Admin</span>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {adminItems(slug).map(({ label, href, icon: Icon }) => {
            const settingsBase = `/${slug}/settings`
            const isActive =
              label === 'Settings'
                ? pathname.startsWith(settingsBase) &&
                  !pathname.startsWith(`${settingsBase}/brand`) &&
                  !pathname.startsWith(`${settingsBase}/publishing`) &&
                  !pathname.startsWith(`${settingsBase}/schedule`) &&
                  !pathname.startsWith(`${settingsBase}/lenses`) &&
                  !pathname.startsWith(`${settingsBase}/billing`) &&
                  !pathname.startsWith(`${settingsBase}/analytics`) &&
                  !pathname.startsWith(`${settingsBase}/feed`) &&
                  !pathname.startsWith(`${settingsBase}/team`)
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
      <div className="border-b border-zinc-200 px-2 py-2">
        {onToggleCollapse && !collapsed && (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <WorkspaceSwitcher />
            </div>
            {toggleBtn}
          </div>
        )}
        {onToggleCollapse && collapsed && (
          <div className="flex justify-center">
            {toggleBtn}
          </div>
        )}
        {!onToggleCollapse && (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <WorkspaceSwitcher />
            </div>
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
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems(slug).map(({ label, href, icon: Icon, comingSoon }) => {
          const isActive = !comingSoon && (pathname === href || pathname.startsWith(href + '/'))
          return (
            <NavItem
              key={label}
              href={href}
              icon={Icon}
              label={label}
              isActive={isActive}
              collapsed={!!collapsed}
              onClick={onLinkClick}
              comingSoon={comingSoon}
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
            href={`/${slug}/settings/lenses`}
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
