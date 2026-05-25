'use client'

import { useWorkspace } from '@/components/providers/workspace-provider'
import { usePublishingAccounts } from '@/hooks/use-publishing-accounts'
import { useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  threads: 'Threads',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

type WorkspaceSwitcherData = {
  id: string
  name: string
  slug: string
  plan: string
  avatarUrl: string | null
  brandColor: string | null
}

export function IdentityBar({ outputId }: { outputId?: string }) {
  const workspace = useWorkspace()
  const { accounts, selected, toggle, loading, byPlatform } = usePublishingAccounts(workspace.id)
  const router = useRouter()
  const [workspacePopoverOpen, setWorkspacePopoverOpen] = useState(false)
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceSwitcherData[]>([])

  useEffect(() => {
    if (workspacePopoverOpen) {
      fetch('/api/workspaces')
        .then(r => r.ok ? r.json() : { workspaces: [] })
        .then(d => setAllWorkspaces(d.workspaces ?? []))
    }
  }, [workspacePopoverOpen])

  function switchWorkspace(slug: string) {
    document.cookie = `clout-active-workspace=${slug}; path=/; max-age=31536000; SameSite=Lax`
    setWorkspacePopoverOpen(false)
    router.push(`/${slug}/dashboard`)
  }

  const initials = workspace.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm">
      {/* Workspace identity */}
      <Popover.Root open={workspacePopoverOpen} onOpenChange={setWorkspacePopoverOpen}>
        <Popover.Trigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50 transition-colors">
            <div
              className="h-5 w-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              style={{ background: workspace.brandColor ?? '#18181b' }}
            >
              {initials}
            </div>
            <span className="font-medium text-zinc-900">{workspace.name}</span>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content side="bottom" align="start" sideOffset={4}
            className="z-50 w-52 rounded-lg border border-zinc-200 bg-white shadow-lg outline-none">
            <div className="p-1.5 space-y-0.5">
              {allWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.slug)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                    ws.slug === workspace.slug
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  )}
                >
                  <div
                    className="h-5 w-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    style={{ background: ws.brandColor ?? '#18181b' }}
                  >
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {ws.slug === workspace.slug && <Check className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div className="h-4 w-px bg-zinc-200" />

      {/* Publishing accounts */}
      {loading ? (
        <div className="h-4 w-48 animate-pulse rounded bg-zinc-100" />
      ) : accounts.length === 0 ? (
        <Link
          href={`/${workspace.slug}/settings/publishing`}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Connect accounts →
        </Link>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(byPlatform).map(([platform, platformAccounts]) => (
            <div key={platform} className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">
                {PLATFORM_LABELS[platform] ?? platform}:
              </span>
              {platformAccounts.map(account => (
                <label
                  key={account.credentialId}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(account.credentialId)}
                    onChange={() => toggle(account.credentialId)}
                    className="h-3 w-3 rounded border-zinc-300 accent-zinc-900"
                  />
                  <span className="text-xs text-zinc-600">{account.displayName}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
