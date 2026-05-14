# Publishing Infrastructure Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/channels` and `/settings/publishing` into a single unified publishing infrastructure page at `/settings/publishing`, with a premium card-grid UI, editorial typography, and clear Distribution Channels / Owned Publishing sections.

**Architecture:** The new `/settings/publishing` page fetches from both `/api/channels` (social platforms: LinkedIn, X, Threads, Instagram, TikTok, Facebook) and `/api/publishing/connections` (owned CMS platforms: WordPress, Shopify). All existing backend logic, API routes, OAuth flows, and database structures are preserved without modification. The `/channels` route becomes a server-side redirect. The sidebar loses the duplicate "Channels" entry.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Lucide React, `cn` utility, Signifier + Geist fonts (already loaded via `styles/tokens.css`), existing shadcn/Radix primitives.

---

## File Map

**Created:**
- `components/publishing/PlatformCard.tsx` — Unified card component for all platforms (social + owned), handles connected/unconnected states.

**Rewritten:**
- `app/(dashboard)/settings/publishing/page.tsx` — New unified publishing infrastructure page (replaces 250-line settings page with full channel + publishing logic).
- `app/(dashboard)/channels/page.tsx` — Gutted and replaced with a server-side `redirect('/settings/publishing')`.

**Modified (navigation + UI):**
- `components/shell/sidebar.tsx` — Remove "Channels" from `adminItems`; remove `/channels` from `ADMIN_PATHS`.
- `components/shell/top-nav.tsx` — Remove `channels` entry from page title map.

**Modified (OAuth callback redirects — 8 files):**
All redirect all `APP_URL/channels?...` to `APP_URL/settings/publishing?...`:
- `app/api/channels/linkedin/callback/route.ts`
- `app/api/channels/x/callback/route.ts`
- `app/api/channels/twitter/callback/route.ts`
- `app/api/channels/threads/callback/route.ts`
- `app/api/channels/instagram/callback/route.ts`
- `app/api/channels/tiktok/callback/route.ts`
- `app/api/channels/facebook/callback/route.ts`
- `app/api/publishing/providers/shopify/callback/route.ts`

---

## Task 1: Update Sidebar Navigation

**Files:**
- Modify: `components/shell/sidebar.tsx`

Remove the "Channels" admin nav item and its admin path entry. Keep "Publishing" pointing to `/settings/publishing` (already correct).

- [ ] **Step 1: Edit adminItems — remove the Channels entry**

In `components/shell/sidebar.tsx`, find and remove this line from `adminItems`:

```diff
 const adminItems = [
   { label: 'Brand', href: '/settings/brand', icon: Palette },
-  { label: 'Channels', href: '/channels', icon: Radio },
   { label: 'Publishing', href: '/settings/publishing', icon: Send },
   { label: 'Schedule', href: '/schedule', icon: CalendarClock },
```

- [ ] **Step 2: Edit ADMIN_PATHS — remove '/channels'**

```diff
-const ADMIN_PATHS = ['/settings', '/channels', '/schedule', '/billing', '/lenses']
+const ADMIN_PATHS = ['/settings', '/schedule', '/billing', '/lenses']
```

- [ ] **Step 3: Remove unused Radio import**

`Radio` is only used by the removed Channels item. Remove it from the Lucide import line:

```diff
 import {
   LayoutDashboard,
   Zap,
   Lock,
   PenSquare,
   Layers,
-  Radio,
   BarChart2,
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in sidebar.tsx

- [ ] **Step 5: Commit**

```bash
git add components/shell/sidebar.tsx
git commit -m "refactor: remove Channels from admin sidebar, consolidate into Publishing"
```

---

## Task 2: Update Top-Nav Page Titles

**Files:**
- Modify: `components/shell/top-nav.tsx`

- [ ] **Step 1: Remove the channels title entry**

In `components/shell/top-nav.tsx`, update `getPageTitle`:

```diff
   const titles: Record<string, string> = {
     dashboard: 'Dashboard',
     capture: 'Capture',
     studio: 'Studio',
     lenses: 'Lenses',
-    channels: 'Channels',
     analytics: 'Analytics',
     billing: 'Billing',
     settings: 'Settings',
     onboarding: 'Onboarding',
   }
```

Note: `/settings/publishing` has first segment `settings` → title "Settings". This is correct since the sidebar shows "Admin" context. No other changes needed.

- [ ] **Step 2: Commit**

```bash
git add components/shell/top-nav.tsx
git commit -m "refactor: remove Channels page title from top-nav"
```

---

## Task 3: Create PlatformCard Component

**Files:**
- Create: `components/publishing/PlatformCard.tsx`

This is the core visual building block for the new page. It renders one platform card in connected or unconnected state. Social channels and owned publishing connections both use this component.

- [ ] **Step 1: Create the file with this exact content**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { RefreshCw, Unlink, Plus, Loader2 } from 'lucide-react'
import { useState } from 'react'

const SEVEN_DAYS_S = 7 * 24 * 60 * 60

function tokenExpiryStatus(
  expiresAt: number | null | undefined
): 'ok' | 'soon' | 'expired' | 'none' {
  if (expiresAt == null) return 'none'
  const nowS = Math.floor(Date.now() / 1000)
  if (expiresAt < nowS) return 'expired'
  if (expiresAt < nowS + SEVEN_DAYS_S) return 'soon'
  return 'ok'
}

function TokenExpiryWarning({
  expiresAt,
  reconnectHref,
}: {
  expiresAt: number | null | undefined
  reconnectHref?: string
}) {
  const status = tokenExpiryStatus(expiresAt)
  if (status === 'ok' || status === 'none') return null
  const daysLeft =
    expiresAt != null
      ? Math.max(0, Math.floor((expiresAt - Math.floor(Date.now() / 1000)) / 86400))
      : 0
  const isExpired = status === 'expired'
  const label = isExpired
    ? 'Session expired — reconnect'
    : daysLeft === 0
    ? 'Expires today — reconnect'
    : `Expires in ${daysLeft}d — reconnect`

  return (
    <span
      className={cn(
        'mt-1 block text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit',
        isExpired
          ? 'bg-red-50 text-red-600 border border-red-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      )}
    >
      {reconnectHref ? <a href={reconnectHref}>{label}</a> : label}
    </span>
  )
}

export interface ConnectedAccount {
  id: string
  label: string
  accountType?: string
  tokenExpiresAt?: number | null
  reconnectHref?: string
  consecutiveFailures?: number
  lastPublishedAt?: string | null
}

export interface PlatformCardProps {
  name: string
  tagline: string
  icon: React.ReactNode
  iconColorClass?: string
  connected: ConnectedAccount[]
  onConnect?: () => void
  connectHref?: string
  connectLabel?: string
  onDisconnect: (id: string) => void
  onAddAnother?: () => void
  addAnotherHref?: string
  addAnotherLabel?: string
}

export function PlatformCard({
  name,
  tagline,
  icon,
  iconColorClass = 'bg-zinc-900',
  connected,
  onConnect,
  connectHref,
  connectLabel = 'Enable Channel',
  onDisconnect,
  onAddAnother,
  addAnotherHref,
  addAnotherLabel,
}: PlatformCardProps) {
  const isConnected = connected.length > 0
  const isDegraded = connected.some((a) => (a.consecutiveFailures ?? 0) >= 3)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function handleDisconnect(id: string) {
    if (!confirm('Disconnect this account?')) return
    setDisconnecting(id)
    await onDisconnect(id)
    setDisconnecting(null)
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-6 transition-all duration-200',
        isConnected
          ? 'border-zinc-200 bg-zinc-50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      )}
    >
      {/* Platform identity */}
      <div className="mb-5 flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            isConnected ? iconColorClass + ' text-white' : 'bg-zinc-100 text-zinc-400'
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-[Signifier,_Georgia,_serif] text-base font-semibold leading-tight text-zinc-900">
              {name}
            </h3>
            {isConnected && !isDegraded && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
            {isDegraded && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Degraded
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{tagline}</p>
        </div>
      </div>

      {/* Connected accounts or CTA */}
      <div className="mt-auto">
        {isConnected ? (
          <div className="space-y-2">
            {connected.map((account) => (
              <div
                key={account.id}
                className={cn(
                  'rounded-xl border bg-white px-4 py-3 transition-colors',
                  (account.consecutiveFailures ?? 0) >= 3
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-zinc-100'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {account.label}
                    </p>
                    {account.accountType && account.accountType !== 'personal' && (
                      <p className="text-xs capitalize text-zinc-400">
                        {account.accountType}
                      </p>
                    )}
                    {account.lastPublishedAt && (
                      <p className="text-xs text-zinc-400">
                        Last published {relativeTime(account.lastPublishedAt)}
                      </p>
                    )}
                    <TokenExpiryWarning
                      expiresAt={account.tokenExpiresAt}
                      reconnectHref={account.reconnectHref}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    {account.reconnectHref && (
                      <a
                        href={account.reconnectHref}
                        className="text-zinc-300 transition-colors hover:text-zinc-600"
                        title="Reconnect"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={disconnecting === account.id}
                      className="text-zinc-300 transition-colors hover:text-red-400 disabled:opacity-40"
                      title="Disconnect"
                    >
                      {disconnecting === account.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add another */}
            {addAnotherHref ? (
              <a
                href={addAnotherHref}
                className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <Plus className="h-3 w-3" />
                {addAnotherLabel ?? `Add another ${name} account`}
              </a>
            ) : onAddAnother ? (
              <button
                type="button"
                onClick={onAddAnother}
                className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <Plus className="h-3 w-3" />
                {addAnotherLabel ?? `Add another ${name} account`}
              </button>
            ) : null}
          </div>
        ) : connectHref ? (
          <a
            href={connectHref}
            className="block w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            {connectLabel}
          </a>
        ) : onConnect ? (
          <button
            type="button"
            onClick={onConnect}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            {connectLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `components/publishing/PlatformCard.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/publishing/PlatformCard.tsx
git commit -m "feat: add PlatformCard component for unified publishing infrastructure UI"
```

---

## Task 4: Rewrite the Publishing Infrastructure Page

**Files:**
- Rewrite: `app/(dashboard)/settings/publishing/page.tsx`

This is the primary task. The new page merges all functionality from the old `/channels` page (social platform connections, OAuth callback parameter handling, modals for LinkedIn/Facebook/Instagram/WordPress/Shopify) with the existing visual framework of the `/settings/publishing` page (workflow strip, planned integrations), and presents everything in the new card-grid layout.

**Data sources:**
- `GET /api/channels` → `Channel[]` — social platform connections (LinkedIn, X, Threads, Instagram, TikTok, Facebook)
- `GET /api/publishing/connections` → `ProviderConnectionSafe[]` — owned CMS connections (WordPress, Shopify)

**URL parameters handled** (identical to old channels page, but `router.replace` targets `/settings/publishing`):
- `?connected=<platform>` — show success toast
- `?error=<code>` — show error toast
- `?select=facebook|instagram|linkedin` — trigger account picker modals

- [ ] **Step 1: Write the complete new page file**

Replace the entire contents of `app/(dashboard)/settings/publishing/page.tsx` with:

```tsx
'use client'

import { useEffect, useState, Suspense, useCallback, Fragment } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Share2, Mail, Globe, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConnectShopifyModal } from '@/components/publishing/ConnectShopifyModal'
import { ConnectWordPressModal } from '@/components/publishing/ConnectWordPressModal'
import { PlatformCard, type ConnectedAccount } from '@/components/publishing/PlatformCard'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'

// ─── Platform icons ───────────────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.72a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
    </svg>
  )
}

function WordPressIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 1.5c1.85 0 3.566.6 4.956 1.597L4.097 16.956A8.476 8.476 0 0 1 3.5 12c0-4.687 3.813-8.5 8.5-8.5zm0 17c-1.85 0-3.566-.6-4.956-1.597l12.859-11.859A8.476 8.476 0 0 1 20.5 12c0 4.687-3.813 8.5-8.5 8.5z" />
    </svg>
  )
}

function ShopifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.623-17.73c-.019-.116-.116-.194-.213-.194s-1.949-.136-1.949-.136-.736-.717-1.086-1.009v-.020c-.039-.875-.778-3.319-3.344-3.319-.078 0-.156.004-.233.01-.33-.443-.776-.619-1.145-.619-2.815.002-4.164 3.526-4.591 5.319l-2.102.651C4.547 5.64 4.508 5.67 4.47 5.709L1.981 23.979h13.356zm-3.938-21.428c-.019.006-.039.013-.059.019l-.813.252c.465-1.801 1.356-2.67 2.137-3.001.019.116.033.272.039.478-.504.281-.959.834-1.304 2.252zm1.902-3.193c.136 0 .252.019.349.058-.01.004-.02.007-.03.011-.562.286-1.082.911-1.45 2.253l-1.62.503c.469-1.571 1.256-2.825 2.751-2.825zm1.398 9.244s-.834-.446-1.843-.446c-1.495 0-1.572.94-1.572 1.175 0 1.301 3.377 1.785 3.377 4.84 0 2.381-1.514 3.921-3.548 3.921-2.443 0-3.686-1.514-3.686-1.514l.659-2.168s1.282 1.106 2.362 1.106c.698 0 .989-.543.989-1.048 0-1.631-2.79-1.7-2.79-4.49 0-2.306 1.65-4.545 5.002-4.545 1.282 0 1.959.37 1.959.37l-.909 2.799z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.535 10.458c-.155-.068-.312-.133-.471-.193-.279-3.566-2.143-5.608-5.41-5.627h-.04c-1.963 0-3.596.837-4.606 2.358l1.718 1.176c.75-1.137 1.927-1.38 2.889-1.38h.027c1.111.007 1.949.33 2.495.96.396.453.658 1.08.788 1.872a14.95 14.95 0 0 0-1.921-.13c-1.935 0-3.34.574-4.178 1.71-.699.942-.848 2.164-.44 3.434.574 1.795 2.138 2.866 4.009 2.866.167 0 .336-.008.507-.024 1.545-.148 2.722-.852 3.498-2.095.597-.95.973-2.182 1.12-3.661.673.406 1.171.94 1.449 1.587.481 1.12.509 2.958-.99 4.455-1.313 1.31-2.892 1.878-5.271 1.895-2.646-.02-4.651-.868-5.961-2.522-1.232-1.556-1.865-3.817-1.883-6.723.018-2.905.651-5.167 1.883-6.722C9.27 3.712 11.276 2.864 13.921 2.844c2.661.02 4.704.872 6.071 2.531.671.82 1.175 1.855 1.503 3.075l2.008-.535c-.395-1.469-1.025-2.74-1.881-3.793C19.888 1.877 17.362.773 13.929.75h-.016c-3.432.022-5.921 1.139-7.549 3.083-1.463 1.768-2.214 4.277-2.241 8.165v.004c.027 3.889.778 6.397 2.241 8.165 1.628 1.942 4.117 3.06 7.549 3.082h.016c3.041-.02 5.192-.817 6.949-2.573 2.091-2.088 2.027-4.727 1.34-6.339-.512-1.192-1.493-2.158-3.183-2.88zM13.73 16.011c-1.174.082-2.113-.527-2.435-1.537-.2-.628-.109-1.17.273-1.674.473-.638 1.251-.96 2.312-.96h.039c.525.003 1.024.06 1.489.169-.17 2.048-.847 3.064-1.678 3.002z" />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'linkedin' | 'x' | 'instagram' | 'tiktok' | 'facebook' | 'threads'

interface Channel {
  id: string
  platform: Platform
  label: string | null
  account_type: string
  is_active: boolean
  token_expires_at: number | null
}

interface PendingPage    { id: string; name: string }
interface PendingAccount { id: string; username: string; name: string }
interface PendingLiProfile { id: string; name: string; type: 'personal' | 'page' }

// ─── Static data ──────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS: {
  key: Platform
  name: string
  tagline: string
  iconColorClass: string
  Icon: React.ComponentType<{ className?: string }>
  connectHref: string | null
}[] = [
  {
    key: 'linkedin',
    name: 'LinkedIn',
    tagline: 'Professional distribution',
    iconColorClass: 'bg-[#0A66C2]',
    Icon: Share2,
    connectHref: null,
  },
  {
    key: 'x',
    name: 'X',
    tagline: 'Real-time distribution',
    iconColorClass: 'bg-zinc-900',
    Icon: XIcon,
    connectHref: '/api/channels/x/connect',
  },
  {
    key: 'threads',
    name: 'Threads',
    tagline: 'Conversational distribution',
    iconColorClass: 'bg-zinc-900',
    Icon: ThreadsIcon,
    connectHref: '/api/channels/threads/connect',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    tagline: 'Visual distribution',
    iconColorClass: 'bg-gradient-to-br from-purple-600 to-pink-500',
    Icon: InstagramIcon,
    connectHref: '/api/channels/instagram/connect',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    tagline: 'Short-form distribution',
    iconColorClass: 'bg-zinc-900',
    Icon: TikTokIcon,
    connectHref: '/api/channels/tiktok/connect',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    tagline: 'Community distribution',
    iconColorClass: 'bg-[#1877F2]',
    Icon: FacebookIcon,
    connectHref: '/api/channels/facebook/connect',
  },
]

const PLANNED = ['Ghost', 'Substack', 'Beehiiv', 'Webflow', 'HubSpot', 'Notion'] as const
const FLOW_STEPS = ['Studio', 'Intelligence', 'Publish', 'Reach'] as const

// ─── Modals ───────────────────────────────────────────────────────────────────

function LinkedInTypePicker({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Connect LinkedIn</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          <a
            href="/api/channels/linkedin/connect"
            className="block w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm transition-colors hover:border-zinc-400"
          >
            <p className="font-medium text-zinc-900">Personal Profile</p>
            <p className="mt-0.5 text-xs text-zinc-400">Connect your own LinkedIn profile</p>
          </a>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-sm font-medium text-zinc-700">Company Page</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Requires LinkedIn Marketing Developer Platform access.{' '}
              <a
                href="https://developer.linkedin.com/product-catalog"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-600"
              >
                Apply here
              </a>
              . Once approved, Company Pages will appear automatically when you connect.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PickerModal({
  title,
  items,
  onSelect,
  onClose,
}: {
  title: string
  items: { id: string; label: string }[]
  onSelect: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [selecting, setSelecting] = useState<string | null>(null)

  async function pick(id: string) {
    setSelecting(id)
    await onSelect(id)
    setSelecting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => pick(item.id)}
              disabled={!!selecting}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                selecting === item.id
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
              )}
            >
              {selecting === item.id ? 'Connecting…' : item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function PublishingInfrastructureContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [socialChannels, setSocialChannels]   = useState<Channel[]>([])
  const [connections, setConnections]         = useState<ProviderConnectionSafe[]>([])
  const [loading, setLoading]                 = useState(true)
  const [toast, setToast]                     = useState<{ msg: string; ok: boolean } | null>(null)

  const [showLinkedInPicker,  setShowLinkedInPicker]  = useState(false)
  const [showWordPressPicker, setShowWordPressPicker]  = useState(false)
  const [showShopifyPicker,   setShowShopifyPicker]    = useState(false)

  const [fbPages,    setFbPages]    = useState<PendingPage[] | null>(null)
  const [igAccounts, setIgAccounts] = useState<PendingAccount[] | null>(null)
  const [liProfiles, setLiProfiles] = useState<PendingLiProfile[] | null>(null)

  function flash(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const reloadChannels = useCallback(async () => {
    const [cRes, pubRes] = await Promise.all([
      fetch('/api/channels'),
      fetch('/api/publishing/connections'),
    ])
    setSocialChannels(cRes.ok ? await cRes.json() : [])
    setConnections(pubRes.ok ? await pubRes.json() : [])
  }, [])

  useEffect(() => {
    async function init() {
      await reloadChannels()
      setLoading(false)
    }
    init()
  }, [reloadChannels])

  // Handle OAuth callback URL params
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    const select    = searchParams.get('select')

    if      (connected === 'linkedin')   flash('LinkedIn connected.', true)
    else if (connected === 'x')          flash('X connected.', true)
    else if (connected === 'threads')    flash('Threads connected.', true)
    else if (connected === 'facebook')   flash('Facebook connected.', true)
    else if (connected === 'instagram')  flash('Instagram connected.', true)
    else if (connected === 'tiktok')     flash('TikTok connected.', true)
    else if (connected === 'shopify')    flash('Shopify store connected.', true)
    else if (error === 'facebook_no_pages')
      flash('No Facebook Pages found. Create a Page and try again.', false)
    else if (error === 'instagram_no_business_account')
      flash('No Instagram Business account found. Link one to a Facebook Page and try again.', false)
    else if (error === 'twitter_pkce_missing' || error === 'x_pkce_missing' || error === 'tiktok_pkce_missing' || error === 'session_expired')
      flash('Session expired — please try again.', false)
    else if (error === 'token_exchange_failed')
      flash('The platform rejected the connection. Check your app credentials.', false)
    else if (error === 'profile_fetch_failed')
      flash("Connected but couldn't fetch your profile. Try again.", false)
    else if (error === 'channel_db_failed' || error === 'credential_db_failed')
      flash('Database error saving channel. Try again.', false)
    else if (error === 'connect_failed')
      flash('Connection failed. Please try again.', false)
    else if (error)
      flash('Connection cancelled.', false)

    if (select === 'facebook') {
      fetch('/api/channels/facebook/pending-pages')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.pages) setFbPages(data.pages) })
      router.replace('/settings/publishing')
    } else if (select === 'instagram') {
      fetch('/api/channels/instagram/pending-accounts')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.accounts) setIgAccounts(data.accounts) })
      router.replace('/settings/publishing')
    } else if (select === 'linkedin') {
      fetch('/api/channels/linkedin/pending-profiles')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.profiles) setLiProfiles(data.profiles) })
      router.replace('/settings/publishing')
    } else if (connected || error) {
      router.replace('/settings/publishing')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect handlers
  async function handleDisconnectChannel(id: string) {
    await fetch(`/api/channels/${id}`, { method: 'DELETE' })
    setSocialChannels(prev => prev.filter(c => c.id !== id))
    flash('Account disconnected.', true)
  }

  async function handleDisconnectConnection(id: string) {
    await fetch(`/api/publishing/connections/${id}`, { method: 'DELETE' })
    setConnections(prev => prev.filter(c => c.id !== id))
    flash('Account disconnected.', true)
  }

  // Picker select handlers
  async function handleSelectFbPage(pageId: string) {
    const res = await fetch('/api/channels/facebook/select-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId }),
    })
    if (res.ok) {
      setFbPages(null)
      await reloadChannels()
      flash('Facebook page connected.', true)
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      flash(data.error ?? 'Failed to connect page.', false)
    }
  }

  async function handleSelectLiProfile(profileId: string) {
    const res = await fetch('/api/channels/linkedin/select-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    })
    if (res.ok) {
      setLiProfiles(null)
      await reloadChannels()
      flash('LinkedIn account connected.', true)
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      flash(data.error ?? 'Failed to connect account.', false)
    }
  }

  async function handleSelectIgAccount(accountId: string) {
    const res = await fetch('/api/channels/instagram/select-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    if (res.ok) {
      setIgAccounts(null)
      await reloadChannels()
      flash('Instagram account connected.', true)
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      flash(data.error ?? 'Failed to connect account.', false)
    }
  }

  // Derive owned publishing connections
  const wpConnections      = connections.filter(c => c.provider === 'wordpress')
  const shopifyConnections = connections.filter(c => c.provider === 'shopify')

  const totalConnected =
    socialChannels.filter(c => c.is_active).length +
    connections.filter(c => c.isActive).length

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-10 pb-16">
        <div className="space-y-2">
          <div className="h-9 w-72 rounded-lg bg-zinc-100" />
          <div className="h-4 w-96 rounded bg-zinc-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-zinc-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed right-5 top-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg transition-all',
          toast.ok
            ? 'border-zinc-200 bg-white text-zinc-900'
            : 'border-red-100 bg-red-50 text-red-800'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showLinkedInPicker && (
        <LinkedInTypePicker onClose={() => setShowLinkedInPicker(false)} />
      )}
      {liProfiles && (
        <PickerModal
          title="Choose a LinkedIn account to connect"
          items={liProfiles.map(p => ({
            id:    p.id,
            label: p.type === 'page' ? `${p.name} · Company Page` : `${p.name} · Personal Profile`,
          }))}
          onSelect={handleSelectLiProfile}
          onClose={() => setLiProfiles(null)}
        />
      )}
      {fbPages && (
        <PickerModal
          title="Choose a Facebook Page to connect"
          items={fbPages.map(p => ({ id: p.id, label: p.name }))}
          onSelect={handleSelectFbPage}
          onClose={() => setFbPages(null)}
        />
      )}
      {igAccounts && (
        <PickerModal
          title="Choose an Instagram account to connect"
          items={igAccounts.map(a => ({
            id:    a.id,
            label: `@${a.username}` + (a.name !== a.username ? ` · ${a.name}` : ''),
          }))}
          onSelect={handleSelectIgAccount}
          onClose={() => setIgAccounts(null)}
        />
      )}
      {showWordPressPicker && (
        <ConnectWordPressModal
          onClose={() => setShowWordPressPicker(false)}
          onConnected={c => {
            setConnections(prev => [c, ...prev])
            setShowWordPressPicker(false)
          }}
        />
      )}
      {showShopifyPicker && (
        <ConnectShopifyModal onClose={() => setShowShopifyPicker(false)} />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-[Signifier,_Georgia,_serif] text-3xl font-semibold tracking-tight text-zinc-900">
              Publishing Infrastructure
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Operate your publishing network from a single workspace.
            </p>
          </div>
          {totalConnected > 0 && (
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-zinc-900">{totalConnected}</p>
              <p className="text-xs text-zinc-400">connected</p>
            </div>
          )}
        </div>
      </div>

      {/* Workflow strip */}
      <div className="mb-10 flex items-center gap-2.5">
        {FLOW_STEPS.map((step, i) => (
          <Fragment key={step}>
            {i > 0 && <span className="select-none text-zinc-300">·</span>}
            <span
              className={cn(
                'text-xs tracking-wide',
                step === 'Publish'
                  ? 'font-medium text-zinc-700'
                  : 'text-zinc-400'
              )}
            >
              {step}
            </span>
          </Fragment>
        ))}
      </div>

      {/* Distribution Channels */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Distribution Channels
          </h2>
          {socialChannels.filter(c => c.is_active).length > 0 && (
            <span className="text-[11px] text-zinc-400">
              {socialChannels.filter(c => c.is_active).length} connected
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_PLATFORMS.map(({ key, name, tagline, iconColorClass, Icon, connectHref }) => {
            const channelsForPlatform = socialChannels.filter(
              c => c.platform === key && c.is_active
            )
            const accounts: ConnectedAccount[] = channelsForPlatform.map(c => ({
              id:              c.id,
              label:           c.label ?? 'Connected account',
              accountType:     c.account_type,
              tokenExpiresAt:  c.token_expires_at,
              reconnectHref:   connectHref ?? undefined,
            }))

            const isLinkedIn = key === 'linkedin'

            return (
              <PlatformCard
                key={key}
                name={name}
                tagline={tagline}
                iconColorClass={iconColorClass}
                icon={<Icon className="h-5 w-5" />}
                connected={accounts}
                onConnect={isLinkedIn ? () => setShowLinkedInPicker(true) : undefined}
                connectHref={!isLinkedIn ? connectHref ?? undefined : undefined}
                connectLabel="Enable Channel"
                onDisconnect={handleDisconnectChannel}
                onAddAnother={isLinkedIn ? () => setShowLinkedInPicker(true) : undefined}
                addAnotherHref={!isLinkedIn ? connectHref ?? undefined : undefined}
              />
            )
          })}
        </div>
      </section>

      {/* Owned Publishing */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Owned Publishing
          </h2>
          {connections.filter(c => c.isActive).length > 0 && (
            <span className="text-[11px] text-zinc-400">
              {connections.filter(c => c.isActive).length} connected
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PlatformCard
            name="WordPress"
            tagline="Self-hosted publishing infrastructure"
            iconColorClass="bg-[#21759B]"
            icon={<WordPressIcon className="h-5 w-5" />}
            connected={wpConnections.map(c => ({
              id:                  c.id,
              label:               c.label,
              consecutiveFailures: c.consecutiveFailureCount,
              lastPublishedAt:     c.lastSuccessfulPublishAt,
            }))}
            onConnect={() => setShowWordPressPicker(true)}
            onDisconnect={handleDisconnectConnection}
            onAddAnother={() => setShowWordPressPicker(true)}
            addAnotherLabel="Add another WordPress site"
            connectLabel="Connect WordPress"
          />
          <PlatformCard
            name="Shopify"
            tagline="Commerce content publishing"
            iconColorClass="bg-[#5E8E3E]"
            icon={<ShopifyIcon className="h-5 w-5" />}
            connected={shopifyConnections.map(c => ({
              id:                  c.id,
              label:               c.label,
              consecutiveFailures: c.consecutiveFailureCount,
              lastPublishedAt:     c.lastSuccessfulPublishAt,
            }))}
            onConnect={() => setShowShopifyPicker(true)}
            onDisconnect={handleDisconnectConnection}
            onAddAnother={() => setShowShopifyPicker(true)}
            addAnotherLabel="Add another Shopify store"
            connectLabel="Connect Shopify"
          />
        </div>
      </section>

      {/* Planned Integrations */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          Planned Integrations
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {PLANNED.map(name => (
            <span
              key={name}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500"
            >
              {name}
            </span>
          ))}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('open-support', { detail: { category: 'feature' } })
              )
            }
            className="px-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
          >
            Request Integration →
          </button>
        </div>
      </section>

    </div>
  )
}

export default function PublishingInfrastructurePage() {
  return <Suspense><PublishingInfrastructureContent /></Suspense>
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors. If there are type errors in the import of `ConnectWordPressModal` (its `onConnected` callback type), look at `components/publishing/ConnectWordPressModal.tsx` line by line and adjust the prop type. The callback should accept `ProviderConnectionSafe`.

- [ ] **Step 3: Verify the imports resolve**

```bash
npx tsc --noEmit 2>&1 | grep "settings/publishing"
```

Expected: empty output (no errors in this file).

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/settings/publishing/page.tsx"
git commit -m "feat: unify publishing infrastructure — merge channels + settings/publishing into single page"
```

---

## Task 5: Update All OAuth Callback Redirects

**Files (8 total):**
- `app/api/channels/linkedin/callback/route.ts`
- `app/api/channels/x/callback/route.ts`
- `app/api/channels/twitter/callback/route.ts`
- `app/api/channels/threads/callback/route.ts`
- `app/api/channels/instagram/callback/route.ts`
- `app/api/channels/tiktok/callback/route.ts`
- `app/api/channels/facebook/callback/route.ts`
- `app/api/publishing/providers/shopify/callback/route.ts`

All these files redirect the browser back to `/channels?...` after OAuth. They need to redirect to `/settings/publishing?...` instead.

- [ ] **Step 1: Bulk-replace all redirects in one command**

```bash
find "/Users/laurenproctor/Documents/Claude Code/Clout v.02/app/api" -name "route.ts" -exec \
  sed -i '' 's|/channels?|/settings/publishing?|g' {} \;
```

- [ ] **Step 2: Verify the replacements**

```bash
grep -r "NextResponse.redirect" \
  "/Users/laurenproctor/Documents/Claude Code/Clout v.02/app/api/channels/" \
  "/Users/laurenproctor/Documents/Claude Code/Clout v.02/app/api/publishing/providers/shopify/callback/" \
  --include="route.ts" -n
```

Expected output: every redirect line should contain `/settings/publishing?`, not `/channels?`. Confirm all 8 files have been updated. Example expected line:
```
return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=linkedin_denied`)
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/channels/linkedin/callback/route.ts \
        app/api/channels/x/callback/route.ts \
        app/api/channels/twitter/callback/route.ts \
        app/api/channels/threads/callback/route.ts \
        app/api/channels/instagram/callback/route.ts \
        app/api/channels/tiktok/callback/route.ts \
        app/api/channels/facebook/callback/route.ts \
        app/api/publishing/providers/shopify/callback/route.ts
git commit -m "refactor: update OAuth callback redirects from /channels to /settings/publishing"
```

---

## Task 6: Replace Channels Page with Redirect

**Files:**
- Rewrite: `app/(dashboard)/channels/page.tsx`

Remove the 977-line client component and replace it with a server-side redirect. Any user or OAuth callback that lands on `/channels` (e.g. old bookmarks, any cached redirect that wasn't caught in Task 5) will be transparently sent to `/settings/publishing`.

- [ ] **Step 1: Replace the channels page with a redirect**

Replace the entire contents of `app/(dashboard)/channels/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

export default function ChannelsPage() {
  redirect('/settings/publishing')
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/channels/page.tsx"
git commit -m "refactor: replace /channels page with permanent redirect to /settings/publishing"
```

---

## Task 7: Verify ConnectWordPressModal Callback Type

**Context:** The new publishing page passes `onConnected={c => { setConnections(prev => [c, ...prev]) }}` to `ConnectWordPressModal`. This requires `onConnected` to accept a `ProviderConnectionSafe` argument. The existing `ConnectWordPressModal` already does this (the old settings/publishing page used the same pattern). This task confirms it and fixes any mismatch.

**Files:**
- Read: `components/publishing/ConnectWordPressModal.tsx`

- [ ] **Step 1: Check the ConnectWordPressModal onConnected signature**

```bash
grep -n "onConnected" "/Users/laurenproctor/Documents/Claude Code/Clout v.02/components/publishing/ConnectWordPressModal.tsx"
```

Expected: a line like `onConnected: (connection: ProviderConnectionSafe) => void` or similar.

- [ ] **Step 2: If the signature is correct, no changes needed. If not, update it.**

If `onConnected` receives `string` (label) rather than `ProviderConnectionSafe`, update the component interface and the API response handling so it passes the full connection object. The API at `POST /api/publishing/connections` returns a `ProviderConnectionSafe` object on success — make sure the component passes that to `onConnected`.

- [ ] **Step 3: Type-check the publishing page in isolation**

```bash
npx tsc --noEmit 2>&1 | grep "settings/publishing\|ConnectWordPress"
```

Expected: empty output.

- [ ] **Step 4: Commit if changes were made**

```bash
git add components/publishing/ConnectWordPressModal.tsx
git commit -m "fix: align ConnectWordPressModal onConnected signature with ProviderConnectionSafe"
```

---

## Verification

### Manual verification checklist

Run the dev server:
```bash
npm run dev
```

Then check each of the following in a browser at `http://localhost:3000`:

**Navigation:**
- [ ] Admin sidebar shows "Publishing" but NOT "Channels"
- [ ] Clicking "Publishing" goes to `/settings/publishing`
- [ ] Going to `/channels` redirects to `/settings/publishing`

**Page layout:**
- [ ] Page title uses Signifier font ("Publishing Infrastructure")
- [ ] Workflow strip shows: Studio · Intelligence · **Publish** · Reach (Publish is darker)
- [ ] "Distribution Channels" section heading is visible
- [ ] 6 social platform cards rendered in a grid (2 cols on tablet, 3 on wide desktop)
- [ ] "Owned Publishing" section heading is visible
- [ ] WordPress and Shopify cards rendered in a 2-column grid
- [ ] "Planned Integrations" section shows Ghost, Substack, Beehiiv, Webflow, HubSpot, Notion chips
- [ ] "Request Integration →" button opens the support modal

**Unconnected cards:**
- [ ] Social platform cards show "Enable Channel" button
- [ ] Clicking LinkedIn "Enable Channel" opens the LinkedIn type picker modal
- [ ] Clicking X/Threads/Instagram/TikTok/Facebook "Enable Channel" navigates to OAuth URL
- [ ] WordPress shows "Connect WordPress" button → opens credential form modal
- [ ] Shopify shows "Connect Shopify" button → opens domain form modal

**Connected cards (test with a connected account if available):**
- [ ] Connected card shows "Active" badge
- [ ] Connected card shows account name
- [ ] Disconnect (Unlink icon) button works and removes the account
- [ ] Reconnect (RefreshCw icon) links to OAuth URL for social channels

**Token expiry:**
- [ ] If a social channel has a token expiring within 7 days, the amber expiry warning appears inside the account row

**OAuth flow end-to-end:**
- [ ] Complete an OAuth connection (any platform). After callback, browser lands on `/settings/publishing?connected=<platform>`, flash message appears, URL cleans up to `/settings/publishing`.

### Type safety
```bash
npx tsc --noEmit
```
Expected: exit 0, no errors.

### Build
```bash
npm run build
```
Expected: successful build with no errors.
