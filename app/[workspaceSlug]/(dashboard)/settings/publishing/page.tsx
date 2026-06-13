'use client'

import { useEffect, useState, Suspense, useCallback, Fragment } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { EditorialIntelligenceCard } from '@/components/analytics/EditorialIntelligenceCard'
import { X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConnectShopifyModal } from '@/components/publishing/ConnectShopifyModal'
import { ConnectWordPressModal } from '@/components/publishing/ConnectWordPressModal'
import { ConnectSubstackModal } from '@/components/publishing/ConnectSubstackModal'
import { PlatformCard, type ConnectedAccount } from '@/components/publishing/PlatformCard'
import { GoogleSearchConsoleCard } from '@/components/publishing/GoogleSearchConsoleCard'
import { BingWebmasterCard } from '@/components/publishing/BingWebmasterCard'
import { UnipileBetaCard } from '@/components/settings/UnipileBetaCard'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'
import { useCanConnectAccount } from '@/hooks/use-entitlements'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingsPageSkeleton } from '@/components/loading/settings-page-skeleton'

const SUBSTACK_ENABLED = process.env.NEXT_PUBLIC_SUBSTACK_PUBLISHING_ENABLED === 'true'

// ─── Platform icons ───────────────────────────────────────────────────────────

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
    </svg>
  )
}

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
      <path fillRule="evenodd" d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.03 1.232-.105 1.232-.105.582-.075.514-.93-.067-.899 0 0-1.755.135-2.88.135-1.064 0-2.85-.15-2.85-.15-.585-.03-.661.855-.075.885 0 0 .54.061 1.125.09l1.68 4.605-2.37 7.08L5.354 6.9c.649-.03 1.234-.1 1.234-.1.585-.075.516-.93-.065-.896 0 0-1.746.138-2.874.138-.2 0-.438-.008-.69-.015C4.911 3.15 8.235 1.215 12 1.215c2.809 0 5.365 1.072 7.286 2.833-.046-.003-.091-.009-.141-.009-1.06 0-1.812.923-1.812 1.914 0 .89.513 1.643 1.06 2.531.411.72.89 1.643.89 2.977 0 .915-.354 1.994-.821 3.479l-1.075 3.585-3.9-11.61.001.014zM12 22.784c-1.059 0-2.081-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149-1.12.393-2.325.609-3.582.609M1.211 12c0-1.564.336-3.05.935-4.39L7.29 21.709C3.694 19.96 1.212 16.271 1.211 12M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0" />
    </svg>
  )
}

function ShopifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.623-17.73c-.019-.116-.116-.194-.213-.194s-1.949-.136-1.949-.136-.736-.717-1.086-1.009v-.02c-.039-.875-.778-3.319-3.344-3.319-.078 0-.156.004-.233.01-.33-.443-.776-.619-1.145-.619-2.815.002-4.164 3.526-4.591 5.319l-2.102.651C4.547 5.64 4.508 5.67 4.47 5.709L1.981 23.979h13.356zm-3.938-21.428c-.019.006-.039.013-.059.019l-.813.252c.465-1.801 1.356-2.67 2.137-3.001.019.116.033.272.039.478-.504.281-.959.834-1.304 2.252zm1.902-3.193c.136 0 .252.019.349.058-.01.004-.02.007-.03.011-.562.286-1.082.911-1.45 2.253l-1.62.503c.469-1.571 1.256-2.825 2.751-2.825zm1.398 9.244s-.834-.446-1.843-.446c-1.495 0-1.572.94-1.572 1.175 0 1.301 3.377 1.785 3.377 4.84 0 2.381-1.514 3.921-3.548 3.921-2.443 0-3.686-1.514-3.686-1.514l.659-2.168s1.282 1.106 2.362 1.106c.698 0 .989-.543.989-1.048 0-1.631-2.79-1.7-2.79-4.49 0-2.306 1.65-4.545 5.002-4.545 1.282 0 1.959.37 1.959.37l-.909 2.799z" />
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

function MediumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function BlueSkyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 530" fill="currentColor" className={className}>
      <path d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.38-3.69-10.832-3.708-7.896-.017-2.935-1.193.516-3.707 7.896-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.45-163.25-81.433C20.153 217.613 10 86.535 10 68.825c0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
  )
}

function MastodonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216.4144 232.00976" className={className}>
      <path fill="#2b90d9" d="M211.80734 139.0875c-3.18125 16.36625-28.4925 34.2775-57.5625 37.74875-15.15875 1.80875-30.08375 3.47125-45.99875 2.74125-26.0275-1.1925-46.565-6.2125-46.565-6.2125 0 2.53375.15625 4.94625.46875 7.2025 3.38375 25.68625 25.47 27.225 46.39125 27.9425 21.11625.7225 39.91875-5.20625 39.91875-5.20625l.8675 19.09s-14.77 7.93125-41.08125 9.39c-14.50875.7975-32.52375-.365-53.50625-5.91875C9.23234 213.82 1.40609 165.31125.20859 116.09125c-.365-14.61375-.14-28.39375-.14-39.91875 0-50.33 32.97625-65.0825 32.97625-65.0825C49.67234 3.45375 78.20359.2425 107.86484 0h.72875c29.66125.2425 58.21125 3.45375 74.8375 11.09 0 0 32.975 14.7525 32.975 65.0825 0 0 .41375 37.13375-4.59875 62.915"/>
      <path fill="#fff" d="M177.50984 80.077v60.94125h-24.14375v-59.15c0-12.46875-5.24625-18.7975-15.74-18.7975-11.6025 0-17.4175 7.5075-17.4175 22.3525v32.37625H96.20734V85.42325c0-14.845-5.81625-22.3525-17.41875-22.3525-10.49375 0-15.74 6.32875-15.74 18.7975v59.15H38.90484V80.077c0-12.455 3.17125-22.3525 9.54125-29.675 6.56875-7.3225 15.17125-11.07625 25.85-11.07625 12.355 0 21.71125 4.74875 27.8975 14.2475l6.01375 10.08125 6.015-10.08125c6.185-9.49875 15.54125-14.2475 27.8975-14.2475 10.6775 0 19.28 3.75375 25.85 11.07625 6.36875 7.3225 9.54 17.22 9.54 29.675"/>
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 814 1000" fill="currentColor" className={className}>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-166.8-105.4C71.5 813.5 12.2 690.2 12.2 573.4c0-214 139.8-327.6 277.9-327.6 71 0 130.2 46.5 173.9 46.5 41.9 0 107.9-49.4 188.3-49.4 30.2 0 108.2 2.6 168.1 80.6zm-119-189.4c29.7-35.1 51.1-83.8 51.1-132.5 0-6.5-.6-13-.6-19.1-48.8 1.9-106.8 32.5-142.1 72.5-26.5 29.9-51.9 78.6-51.9 128.1 0 7.1 1.3 14.3 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 43.9 0 97.2-29.3 128-66.8z" />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'linkedin' | 'x' | 'instagram' | 'tiktok' | 'facebook' | 'threads' | 'bluesky' | 'mastodon'

interface Channel {
  id: string
  platform: string
  label: string | null
  account_type: string
  is_active: boolean
  token_expires_at: number | null
  profile_image_url?: string | null
  google_location_name?: string | null
  google_location_address?: { locality?: string; administrativeArea?: string } | null
  google_verified?: boolean | null
  apple_business_name?: string | null
  apple_address?: { city?: string; stateOrProvince?: string } | null
}

interface PendingPage    { id: string; name: string }
interface PendingAccount { id: string; username: string; name: string }
interface PendingLiProfile { id: string; name: string; type: 'personal' | 'page' }
interface PendingGBPLocation {
  locationName: string
  accountName: string
  title: string
  city: string | null
  state: string | null
  isVerified: boolean
  profilePhotoUrl: string | null
}

interface PendingABCLocation {
  locationId: string
  businessId: string
  companyId:  string
  name:       string
  city:       string | null
  state:      string | null
}

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
    iconColorClass: 'text-[#0A66C2]',
    Icon: LinkedInIcon,
    connectHref: null,
  },
  {
    key: 'x',
    name: 'X',
    tagline: 'Real-time distribution',
    iconColorClass: 'text-zinc-900',
    Icon: XIcon,
    connectHref: '/api/channels/x/connect',
  },
  {
    key: 'threads',
    name: 'Threads',
    tagline: 'Conversational distribution',
    iconColorClass: 'text-zinc-900',
    Icon: ThreadsIcon,
    connectHref: '/api/channels/threads/connect',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    tagline: 'Visual distribution',
    iconColorClass: 'text-[#E1306C]',
    Icon: InstagramIcon,
    connectHref: '/api/channels/instagram/connect',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    tagline: 'Short-form distribution',
    iconColorClass: 'text-zinc-950',
    Icon: TikTokIcon,
    connectHref: '/api/channels/tiktok/connect',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    tagline: 'Community distribution',
    iconColorClass: 'text-[#1877F2]',
    Icon: FacebookIcon,
    connectHref: '/api/channels/facebook/connect',
  },
  {
    key:            'bluesky',
    name:           'BlueSky',
    tagline:        'Open social distribution',
    iconColorClass: 'text-[#0085ff]',
    Icon:           BlueSkyIcon,
    connectHref:    null,
  },
  {
    key:            'mastodon',
    name:           'Mastodon',
    tagline:        'Fediverse distribution',
    iconColorClass: 'text-[#6364FF]',
    Icon:           MastodonIcon,
    connectHref:    null,
  },
]

const PLANNED_BASE = ['YouTube', 'Reddit', 'Ghost', 'Beehiiv', 'Webflow', 'Squarespace', 'Wix', 'HubSpot', 'Nextdoor', 'Patch'] as const
const PLANNED = SUBSTACK_ENABLED
  ? PLANNED_BASE
  : [...PLANNED_BASE, 'Substack'] as const
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

function BlueSkyConnectModal({ onClose, initialHandle }: { onClose: () => void; initialHandle?: string }) {
  const [handle, setHandle] = useState(initialHandle ?? '')
  const [error, setError]   = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = handle.trim().replace(/^@/, '')
    if (!normalized) {
      setError('Enter your BlueSky handle')
      return
    }
    window.location.href = `/api/channels/bluesky/connect?handle=${encodeURIComponent(normalized)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Connect BlueSky</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-500">Enter your BlueSky handle to connect your account.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="@username.bsky.social"
            value={handle}
            onChange={e => { setHandle(e.target.value); setError('') }}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700">
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MastodonConnectModal({ onClose }: { onClose: () => void }) {
  const [instance, setInstance] = useState('')
  const [error, setError]       = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = instance.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
    if (!normalized) {
      setError('Enter your Mastodon instance URL')
      return
    }
    window.location.href = `/api/channels/mastodon/connect?instance=${encodeURIComponent(normalized)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Connect Mastodon</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          Enter your Mastodon instance URL (e.g. mastodon.social, fosstodon.org).
          Mastodon only — Pleroma, Akkoma, and Misskey are not supported.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="mastodon.social"
            value={instance}
            onChange={e => { setInstance(e.target.value); setError('') }}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700">
              Connect
            </button>
          </div>
        </form>
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

function GBPLocationPicker({
  locations,
  onConnect,
  onClose,
}: {
  locations: PendingGBPLocation[]
  onConnect: (locationNames: string[]) => Promise<void>
  onClose: () => void
}) {
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState(false)

  const sorted   = [...locations].sort((a, b) => a.title.localeCompare(b.title))
  const q        = search.toLowerCase()
  const filtered = sorted.filter(loc =>
    !q ||
    loc.title.toLowerCase().includes(q) ||
    loc.city?.toLowerCase().includes(q) ||
    loc.state?.toLowerCase().includes(q)
  )

  function toggle(locationName: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(locationName)) next.delete(locationName)
      else next.add(locationName)
      return next
    })
  }

  async function handleConnect() {
    if (selected.size === 0 || connecting) return
    setConnecting(true)
    await onConnect([...selected])
    setConnecting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Connect Google Business Profile</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {locations.length > 4 && (
          <input
            type="text"
            placeholder="Search locations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        )}

        <div className="max-h-72 overflow-y-auto space-y-0.5">
          {filtered.map(loc => (
            <label
              key={loc.locationName}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-zinc-200"
            >
              <input
                type="checkbox"
                checked={selected.has(loc.locationName)}
                onChange={() => toggle(loc.locationName)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{loc.title}</p>
                {(loc.city || loc.state) && (
                  <p className="text-xs text-zinc-400">
                    {[loc.city, loc.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              {loc.isVerified && (
                <span className="shrink-0 text-[11px] font-medium text-emerald-600">Verified</span>
              )}
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-400">No locations match your search.</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
          <span className="text-xs text-zinc-400">
            {selected.size > 0 ? `${selected.size} selected` : 'Select locations to connect'}
          </span>
          <button
            onClick={handleConnect}
            disabled={selected.size === 0 || connecting}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              selected.size > 0 && !connecting
                ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                : 'cursor-not-allowed bg-zinc-100 text-zinc-400'
            )}
          >
            {connecting ? 'Connecting…' : 'Connect Selected'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ABCConnectModal({
  onClose,
  onSuccess,
}: {
  onClose:   () => void
  onSuccess: (locations: PendingABCLocation[]) => void
}) {
  const [keyId,      setKeyId]      = useState('')
  const [issuerId,   setIssuerId]   = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!keyId.trim() || !issuerId.trim() || !privateKey.trim()) {
      setError('All three fields are required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/channels/apple-business-connect/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          keyId:      keyId.trim(),
          issuerId:   issuerId.trim(),
          privateKey: privateKey.trim(),
        }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Invalid credentials or API error. Verify your Key ID, Issuer ID, and private key.')
        return
      }
      const locRes  = await fetch('/api/channels/apple-business-connect/pending-locations')
      const locData = await locRes.json().catch(() => ({})) as { locations?: PendingABCLocation[] }
      onSuccess(locData.locations ?? [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <AppleIcon className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">Connect Apple Business Connect</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-400">
          Find these in{' '}
          <a
            href="https://businessconnect.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Apple Business Connect → API Keys
          </a>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Key ID</label>
              <span className="text-[10px] text-zinc-400">e.g. ABC123XYZ</span>
            </div>
            <input
              type="text"
              value={keyId}
              onChange={e => { setKeyId(e.target.value); setError('') }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400"
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Issuer ID</label>
              <span className="text-[10px] text-zinc-400">UUID format</span>
            </div>
            <input
              type="text"
              value={issuerId}
              onChange={e => { setIssuerId(e.target.value); setError('') }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Private Key</label>
              <span className="text-[10px] text-zinc-400">PEM — include BEGIN/END headers</span>
            </div>
            <textarea
              value={privateKey}
              onChange={e => { setPrivateKey(e.target.value); setError('') }}
              rows={4}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
            />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Your private key is encrypted at rest and never exposed in the UI after saving.
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? 'Validating…' : 'Validate & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ABCLocationPicker({
  locations,
  onConnect,
  onClose,
  onReenterCredentials,
}: {
  locations:            PendingABCLocation[]
  onConnect:            (locationIds: string[]) => Promise<void>
  onClose:              () => void
  onReenterCredentials: () => void
}) {
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState(false)

  const sorted   = [...locations].sort((a, b) => a.name.localeCompare(b.name))
  const q        = search.toLowerCase()
  const filtered = sorted.filter(loc =>
    !q ||
    loc.name.toLowerCase().includes(q) ||
    loc.city?.toLowerCase().includes(q) ||
    loc.state?.toLowerCase().includes(q)
  )

  function toggle(locationId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(locationId)) next.delete(locationId)
      else next.add(locationId)
      return next
    })
  }

  async function handleConnect() {
    if (selected.size === 0 || connecting) return
    setConnecting(true)
    await onConnect([...selected])
    setConnecting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Connect Apple Business Connect</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-500">No locations found.</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Ensure your API key has access to at least one verified business location in Apple Business Connect.
            </p>
            <button
              onClick={onReenterCredentials}
              className="mt-3 text-xs text-blue-500 hover:underline"
            >
              Re-enter Credentials
            </button>
          </div>
        ) : (
          <>
            {locations.length > 8 && (
              <input
                type="text"
                placeholder="Search locations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            )}

            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {filtered.map(loc => (
                <label
                  key={loc.locationId}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-zinc-200"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(loc.locationId)}
                    onChange={() => toggle(loc.locationId)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{loc.name}</p>
                    {(loc.city || loc.state) && (
                      <p className="text-xs text-zinc-400">
                        {[loc.city, loc.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-400">No locations match your search.</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
              <span className="text-xs text-zinc-400">
                {selected.size > 0 ? `${selected.size} selected` : 'Select locations to connect'}
              </span>
              <button
                onClick={handleConnect}
                disabled={selected.size === 0 || connecting}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  selected.size > 0 && !connecting
                    ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                    : 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                )}
              >
                {connecting ? 'Connecting…' : 'Connect Selected'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function PublishingInfrastructureContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { slug }     = useWorkspace()

  const [socialChannels, setSocialChannels]   = useState<Channel[]>([])
  const [connections, setConnections]         = useState<ProviderConnectionSafe[]>([])
  const [loading, setLoading]                 = useState(true)
  const [toast, setToast]                     = useState<{ msg: string; ok: boolean } | null>(null)

  const canConnect = useCanConnectAccount()

  const [showLinkedInPicker,   setShowLinkedInPicker]   = useState(false)
  const [showWordPressPicker,  setShowWordPressPicker]   = useState(false)
  const [showShopifyPicker,    setShowShopifyPicker]     = useState(false)
  const [showSubstackPicker,   setShowSubstackPicker]    = useState(false)
  const [showBlueSkyModal,    setShowBlueSkyModal]     = useState(false)
  const [blueSkyReconnectHandle, setBlueSkyReconnectHandle] = useState<string | undefined>(undefined)
  const [showMastodonModal,   setShowMastodonModal]    = useState(false)

  const [fbPages,      setFbPages]      = useState<PendingPage[] | null>(null)
  const [igAccounts,   setIgAccounts]   = useState<PendingAccount[] | null>(null)
  const [liProfiles,   setLiProfiles]   = useState<PendingLiProfile[] | null>(null)
  const [gbpLocations, setGbpLocations] = useState<PendingGBPLocation[] | null>(null)
  const [abcLocations, setAbcLocations] = useState<PendingABCLocation[] | null>(null)
  const [showABCModal, setShowABCModal] = useState(false)

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

    if      (connected === 'linkedin')              flash('LinkedIn connected.', true)
    else if (connected === 'x')                     flash('X connected.', true)
    else if (connected === 'threads')               flash('Threads connected.', true)
    else if (connected === 'facebook')              flash('Facebook connected.', true)
    else if (connected === 'instagram')             flash('Instagram connected.', true)
    else if (connected === 'tiktok')                flash('TikTok connected.', true)
    else if (connected === 'shopify')               flash('Shopify store connected.', true)
    else if (connected === 'medium')                flash('Medium connected.', true)
    else if (connected === 'google_business_profile') flash('Google Business Profile location connected.', true)
    else if (connected === 'google') flash('Google Analytics & Search Console connected.', true)
    else if (connected === 'bing') flash('Bing Webmaster Tools connected.', true)
    else if (connected === 'bluesky')              flash('BlueSky connected.', true)
    else if (connected === 'mastodon')             flash('Mastodon connected.', true)
    else if (error === 'mastodon_denied')          flash('Mastodon connection cancelled.', false)
    else if (error === 'mastodon_registration_failed') flash('Mastodon app registration failed. Check the instance URL and try again.', false)
    else if (error === 'mastodon_app_not_found')   flash('Mastodon app registration not found. Try connecting again.', false)
    else if (error === 'gbp_no_locations')
      flash('No Google Business Profile locations found on this account.', false)
    else if (error === 'facebook_no_pages')
      flash('No Facebook Pages found. Create a Page and try again.', false)
    else if (error === 'instagram_no_business_account')
      flash('No Instagram Business account found. Link one to a Facebook Page and try again.', false)
    else if (
      error === 'twitter_pkce_missing' ||
      error === 'x_pkce_missing' ||
      error === 'tiktok_pkce_missing' ||
      error === 'session_expired'
    )
      flash('Session expired — please try again.', false)
    else if (error === 'token_exchange_failed')
      flash('The platform rejected the connection. Check your app credentials.', false)
    else if (error === 'bing_denied') flash('Bing connection cancelled.', false)
    else if (error === 'bing_token_exchange_failed') flash('Bing rejected the connection. Check your app credentials.', false)
    else if (error === 'bing_server_error') flash('Bing connection failed — server error. Try again.', false)
    else if (error === 'bluesky_denied')           flash('BlueSky connection cancelled.', false)
    else if (error === 'bluesky_handle_not_found') flash('BlueSky handle not found. Check the handle and try again.', false)
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
    } else if (select === 'google_business_profile') {
      fetch('/api/channels/google-business-profile/pending-locations')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.locations) setGbpLocations(data.locations) })
      router.replace('/settings/publishing')
    } else if (searchParams.get('reconnect') === 'bluesky') {
      const handle = searchParams.get('handle') ?? undefined
      setBlueSkyReconnectHandle(handle)
      setShowBlueSkyModal(true)
      router.replace(`/${slug}/settings/publishing`)
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

  // Account picker handlers
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

  async function handleSelectGBPLocations(locationNames: string[]) {
    const res = await fetch('/api/channels/google-business-profile/select-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationNames }),
    })
    if (res.ok) {
      setGbpLocations(null)
      await reloadChannels()
      flash(
        locationNames.length === 1
          ? 'Google Business Profile location connected.'
          : `${locationNames.length} Google Business Profile locations connected.`,
        true
      )
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      flash(data.error ?? 'Failed to connect locations.', false)
    }
  }

  async function handleConnectABC() {
    const storedRes = await fetch('/api/channels/apple-business-connect/connect-stored', { method: 'POST' })
    if (storedRes.ok) {
      const locRes  = await fetch('/api/channels/apple-business-connect/pending-locations')
      const locData = await locRes.json().catch(() => ({})) as { locations?: PendingABCLocation[] }
      setAbcLocations(locData.locations ?? [])
    } else {
      setShowABCModal(true)
    }
  }

  async function handleSelectABCLocations(locationIds: string[]) {
    const res = await fetch('/api/channels/apple-business-connect/select-locations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ locationIds }),
    })
    if (res.ok) {
      setAbcLocations(null)
      await reloadChannels()
      flash(
        locationIds.length === 1
          ? 'Apple Business Connect location connected.'
          : `${locationIds.length} Apple Business Connect locations connected.`,
        true,
      )
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      flash(data.error ?? 'Failed to connect locations.', false)
    }
  }

  // Gate connect actions behind the entitlement check.
  // While loading (null) we allow; only block when explicitly false.
  const connectBlocked = canConnect === false

  function guardedHref(href: string | null | undefined): string | undefined {
    if (connectBlocked) return undefined
    return href ?? undefined
  }

  function guardedOnConnect(handler: (() => void) | undefined): (() => void) | undefined {
    if (connectBlocked) return () => flash('Upgrade your plan to connect more accounts.', false)
    return handler
  }

  const wpConnections       = connections.filter(c => c.provider === 'wordpress')
  const shopifyConnections  = connections.filter(c => c.provider === 'shopify')
  const substackConnections = connections.filter(c => c.provider === 'substack')
  const gbpChannels        = socialChannels.filter(c => c.platform === 'google_business_profile' && c.is_active)
  const abcChannels        = socialChannels.filter(c => c.platform === 'apple_business_connect' && c.is_active)

  const [feedUrl, setFeedUrl]     = useState<string | null>(null)
  const [feedCopied, setFeedCopied] = useState(false)

  useEffect(() => {
    fetch('/api/feeds/token')
      .then(r => r.ok ? r.json() : null)
      .then((d: { feedUrl: string } | null) => { if (d?.feedUrl) setFeedUrl(d.feedUrl) })
  }, [])

  async function copyFeedUrl() {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    setFeedCopied(true)
    setTimeout(() => setFeedCopied(false), 2000)
  }

  const totalConnected =
    socialChannels.filter(c => c.is_active).length +
    connections.filter(c => c.isActive).length

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-10 pb-16">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
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
          'fixed right-5 top-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg',
          toast.ok
            ? 'border-zinc-200 bg-white text-zinc-900'
            : 'border-red-100 bg-red-50 text-red-800'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showLinkedInPicker && !connectBlocked && (
        <LinkedInTypePicker onClose={() => setShowLinkedInPicker(false)} />
      )}
      {showBlueSkyModal && !connectBlocked && (
        <BlueSkyConnectModal
          initialHandle={blueSkyReconnectHandle}
          onClose={() => { setShowBlueSkyModal(false); setBlueSkyReconnectHandle(undefined) }}
        />
      )}
      {showMastodonModal && !connectBlocked && (
        <MastodonConnectModal onClose={() => setShowMastodonModal(false)} />
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
      {SUBSTACK_ENABLED && showSubstackPicker && (
        <ConnectSubstackModal
          onClose={() => setShowSubstackPicker(false)}
          onConnected={c => {
            setConnections(prev => [c, ...prev])
            setShowSubstackPicker(false)
            flash('Substack connected.', true)
          }}
        />
      )}
      {gbpLocations && (
        <GBPLocationPicker
          locations={gbpLocations}
          onConnect={handleSelectGBPLocations}
          onClose={() => setGbpLocations(null)}
        />
      )}
      {showABCModal && !connectBlocked && (
        <ABCConnectModal
          onClose={() => setShowABCModal(false)}
          onSuccess={locations => {
            setShowABCModal(false)
            setAbcLocations(locations)
          }}
        />
      )}
      {abcLocations !== null && (
        <ABCLocationPicker
          locations={abcLocations}
          onConnect={handleSelectABCLocations}
          onClose={() => setAbcLocations(null)}
          onReenterCredentials={() => {
            setAbcLocations(null)
            setShowABCModal(true)
          }}
        />
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

      {/* Analytics */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">Analytics</h2>
        </div>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
          <EditorialIntelligenceCard />
        </Suspense>
      </section>

      {/* Search Performance */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">Search Performance</h2>
        </div>
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-2xl" />}>
            <GoogleSearchConsoleCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-2xl" />}>
            <BingWebmasterCard />
          </Suspense>
        </div>
      </section>

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
              profileImageUrl: c.profile_image_url ?? undefined,
            }))

            const isLinkedIn  = key === 'linkedin'
            const isBlueSky   = key === 'bluesky'
            const isMastodon  = key === 'mastodon'
            const isModalPlatform = isBlueSky || isLinkedIn || isMastodon

            return (
              <PlatformCard
                key={key}
                name={name}
                tagline={tagline}
                iconColorClass={iconColorClass}
                icon={<Icon className="h-5 w-5" />}
                connected={accounts}
                onConnect={guardedOnConnect(
                  isBlueSky  ? () => setShowBlueSkyModal(true) :
                  isLinkedIn ? () => setShowLinkedInPicker(true) :
                  isMastodon ? () => setShowMastodonModal(true) :
                  undefined
                )}
                connectHref={!isModalPlatform ? guardedHref(connectHref) : undefined}
                onDisconnect={handleDisconnectChannel}
                onAddAnother={guardedOnConnect(
                  isBlueSky  ? () => setShowBlueSkyModal(true) :
                  isLinkedIn ? () => setShowLinkedInPicker(true) :
                  isMastodon ? () => setShowMastodonModal(true) :
                  undefined
                )}
                addAnotherHref={!isModalPlatform ? guardedHref(connectHref) : undefined}
              />
            )
          })}
        </div>
      </section>

      {/* LinkedIn Intelligence (Beta) — opt-in Unipile connector; renders only when enabled */}
      <UnipileBetaCard />

      {/* Local Distribution */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Local Distribution
          </h2>
          {gbpChannels.length > 0 && (
            <span className="text-[11px] text-zinc-400">{gbpChannels.length} location{gbpChannels.length !== 1 ? 's' : ''} connected</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlatformCard
            name="Google Business Profile"
            tagline="Search presence · local trust signals"
            iconColorClass=""
            icon={<GoogleIcon className="h-5 w-5" />}
            connected={gbpChannels.map(c => ({
              id:             c.id,
              label:          c.label ?? c.google_location_name ?? 'Connected location',
              accountType:    c.account_type,
              tokenExpiresAt: c.token_expires_at,
              reconnectHref:  '/api/channels/google-business-profile/connect',
            }))}
            connectHref={guardedHref('/api/channels/google-business-profile/connect')}
            connectLabel="Connect Location"
            onConnect={connectBlocked ? guardedOnConnect(undefined) : undefined}
            onDisconnect={handleDisconnectChannel}
            addAnotherHref={guardedHref('/api/channels/google-business-profile/connect')}
            onAddAnother={connectBlocked ? guardedOnConnect(undefined) : undefined}
          />
          <PlatformCard
            name="Apple Business Connect"
            tagline="Maps presence · business showcase"
            iconColorClass=""
            icon={
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-black">
                <AppleIcon className="h-[18px] w-[18px] text-white" />
              </div>
            }
            connected={abcChannels.map(c => ({
              id:       c.id,
              label:    c.label ?? 'Connected location',
              subtitle: [
                c.apple_business_name,
                c.apple_address?.city,
                c.apple_address?.stateOrProvince,
              ].filter(Boolean).join(' · ') || undefined,
            }))}
            onConnect={guardedOnConnect(handleConnectABC)}
            connectLabel="Connect Location"
            onDisconnect={handleDisconnectChannel}
            onAddAnother={guardedOnConnect(handleConnectABC)}
            addAnotherLabel="Add another location"
          />
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
            iconColorClass="text-[#21759B]"
            icon={<WordPressIcon className="h-5 w-5" />}
            connected={wpConnections.map(c => ({
              id:                  c.id,
              label:               c.label,
              consecutiveFailures: c.consecutiveFailureCount,
              lastPublishedAt:     c.lastSuccessfulPublishAt,
              profileImageUrl:     c.siteUrl ? `${c.siteUrl.replace(/\/$/, '')}/favicon.ico` : undefined,
            }))}
            onConnect={guardedOnConnect(() => setShowWordPressPicker(true))}
            onDisconnect={handleDisconnectConnection}
            onAddAnother={guardedOnConnect(() => setShowWordPressPicker(true))}
            addAnotherLabel="Add another WordPress site"
            connectLabel="Connect WordPress"
          />
          <PlatformCard
            name="Shopify"
            tagline="Commerce content publishing"
            iconColorClass="text-[#5E8E3E]"
            icon={<ShopifyIcon className="h-5 w-5" />}
            connected={shopifyConnections.map(c => ({
              id:                  c.id,
              label:               c.label,
              consecutiveFailures: c.consecutiveFailureCount,
              lastPublishedAt:     c.lastSuccessfulPublishAt,
              profileImageUrl:     c.siteUrl ? `${c.siteUrl.replace(/\/$/, '')}/favicon.ico` : undefined,
            }))}
            onConnect={guardedOnConnect(() => setShowShopifyPicker(true))}
            onDisconnect={handleDisconnectConnection}
            onAddAnother={guardedOnConnect(() => setShowShopifyPicker(true))}
            addAnotherLabel="Add another Shopify store"
            connectLabel="Connect Shopify"
          />
          {SUBSTACK_ENABLED && (
            <PlatformCard
              name="Substack"
              tagline="Newsletter drafts · subscription-native publishing"
              iconColorClass="text-[#FF6719]"
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
                </svg>
              }
              connected={substackConnections.map(c => ({
                id:                  c.id,
                label:               c.label,
                consecutiveFailures: c.consecutiveFailureCount,
                lastPublishedAt:     c.lastSuccessfulPublishAt,
              }))}
              onConnect={guardedOnConnect(() => setShowSubstackPicker(true))}
              onDisconnect={handleDisconnectConnection}
              onAddAnother={guardedOnConnect(() => setShowSubstackPicker(true))}
              addAnotherLabel="Add another Substack"
              connectLabel="Connect Substack"
              infoNote="Beta — creates drafts only. Publish from the Substack editor."
            />
          )}
          {/* Medium — RSS import (Medium v1 API no longer accepts new connections) */}
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                <MediumIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="font-[Signifier,_Georgia,_serif] text-base font-semibold leading-tight text-zinc-900">
                  Medium
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">Editorial · longform · authority-native</p>
              </div>
            </div>

            <div className="mt-auto space-y-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">Your RSS feed</p>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-600">
                    {feedUrl ?? 'Loading…'}
                  </p>
                  <button
                    onClick={copyFeedUrl}
                    disabled={!feedUrl}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40"
                    title="Copy feed URL"
                  >
                    {feedCopied
                      ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>

              <ol className="space-y-1.5 text-xs text-zinc-500">
                <li className="flex gap-2">
                  <span className="shrink-0 font-medium text-zinc-700">1.</span>
                  Copy the feed URL above
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-medium text-zinc-700">2.</span>
                  Go to medium.com → Settings → RSS Import, paste the URL
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-medium text-zinc-700">3.</span>
                  Medium polls it periodically and imports new articles as drafts
                </li>
              </ol>

              <p className="text-[11px] leading-relaxed text-zinc-400">
                Articles published via Clout to WordPress, Ghost, or any other provider appear in this feed automatically. Medium preserves the original canonical URL on import.
              </p>
            </div>
          </div>
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
  return <Suspense fallback={<SettingsPageSkeleton />}><PublishingInfrastructureContent /></Suspense>
}
