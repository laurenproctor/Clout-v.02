'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Check, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CreateWorkspaceModal } from './create-workspace-modal'
import { useCanCreateWorkspace } from '@/hooks/use-entitlements'

type WorkspaceItem = {
  id: string
  name: string
  slug: string
  plan: string
  avatarUrl: string | null
  brandColor: string | null
}

function WorkspaceAvatar({ name, brandColor, avatarUrl, size = 24 }: {
  name: string
  brandColor: string | null
  avatarUrl: string | null
  size?: number
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-md object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-md flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{
        width: size,
        height: size,
        background: brandColor ?? '#18181b',
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  )
}

export function WorkspaceSwitcher() {
  const active = useWorkspace()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const canCreate = useCanCreateWorkspace()

  useEffect(() => {
    if (open) {
      fetch('/api/workspaces')
        .then((r) => r.ok ? r.json() : { workspaces: [] })
        .then((d) => setWorkspaces(d.workspaces ?? []))
    }
  }, [open])

  function switchWorkspace(slug: string) {
    document.cookie = `clout-active-workspace=${slug}; path=/; max-age=31536000; SameSite=Lax`
    setOpen(false)
    router.push(`/${slug}/dashboard`)
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 transition-colors">
            <WorkspaceAvatar
              name={active.name}
              brandColor={active.brandColor}
              avatarUrl={active.avatarUrl}
              size={24}
            />
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-zinc-900 truncate">{active.name}</div>
              <div className="text-xs text-zinc-400 capitalize">{active.plan}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="right"
            align="start"
            sideOffset={4}
            className="z-50 w-56 rounded-lg border border-zinc-200 bg-white shadow-lg outline-none"
          >
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Workspaces
              </p>
            </div>

            <div className="p-1.5 space-y-0.5">
              {workspaces.map((ws) => {
                const isActive = ws.slug === active.slug
                return (
                  <button
                    key={ws.id}
                    onClick={() => switchWorkspace(ws.slug)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    )}
                  >
                    <WorkspaceAvatar
                      name={ws.name}
                      brandColor={ws.brandColor}
                      avatarUrl={ws.avatarUrl}
                      size={22}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">{ws.name}</div>
                      <div className={cn('text-xs capitalize', isActive ? 'text-zinc-300' : 'text-zinc-400')}>
                        {ws.plan}
                      </div>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-zinc-100 p-1.5 space-y-0.5">
              <button
                onClick={() => { setOpen(false); setShowCreate(true) }}
                disabled={canCreate === false}
                title={canCreate === false ? 'Upgrade your plan to create more workspaces' : undefined}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Create workspace
              </button>
              <Link
                href={`/${active.slug}/settings/workspace`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Workspace settings
              </Link>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <CreateWorkspaceModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(slug) => {
          document.cookie = `clout-active-workspace=${slug}; path=/; max-age=31536000; SameSite=Lax`
          router.push(`/${slug}/dashboard`)
        }}
      />
    </>
  )
}
