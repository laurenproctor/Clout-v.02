'use client'

import type { ChannelPlatform } from '@/types/domain'
import { LinkedInPreview } from './previews/LinkedInPreview'
import { XPreview } from './previews/XPreview'
import { ThreadsPreview } from './previews/ThreadsPreview'
import { NewsletterPreview } from './previews/NewsletterPreview'

interface PlatformPreviewProps {
  platform: ChannelPlatform
  accountName: string
  handle: string
  body: string
  subject?: string
  avatarUrl?: string
}

export function PlatformPreview({
  platform,
  accountName,
  handle,
  body,
  subject,
  avatarUrl,
}: PlatformPreviewProps) {
  switch (platform) {
    case 'linkedin':
      return (
        <LinkedInPreview
          accountName={accountName}
          handle={handle}
          body={body}
          avatarUrl={avatarUrl}
        />
      )
    case 'x':
    case 'twitter':
      return (
        <XPreview
          displayName={accountName}
          handle={handle}
          body={body}
          avatarUrl={avatarUrl}
        />
      )
    case 'threads':
      return (
        <ThreadsPreview handle={handle} body={body} avatarUrl={avatarUrl} />
      )
    case 'newsletter':
      return (
        <NewsletterPreview
          subject={subject ?? ''}
          senderName={accountName}
          body={body}
        />
      )
    default:
      return (
        <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl p-6 text-center">
          <p className="text-[12px] text-zinc-400">
            Preview not available for{' '}
            <span className="font-semibold capitalize">{platform.replace(/_/g, ' ')}</span>
          </p>
        </div>
      )
  }
}
