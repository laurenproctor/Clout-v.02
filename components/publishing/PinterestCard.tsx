'use client'

import { useState } from 'react'
import { PlatformCard, type ConnectedAccount } from '@/components/publishing/PlatformCard'
import { PinterestBoardModal } from '@/components/publishing/PinterestBoardModal'

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.194-.333 1.361-.052.22-.173.267-.4.161-1.493-.695-2.426-2.876-2.426-4.629 0-3.769 2.739-7.229 7.896-7.229 4.146 0 7.369 2.954 7.369 6.903 0 4.119-2.597 7.435-6.201 7.435-1.211 0-2.35-.63-2.74-1.373l-.745 2.842c-.27 1.038-.999 2.339-1.488 3.132C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  )
}

export interface PinterestChannel {
  id: string
  label: string | null
  account_type: string
  token_expires_at: number | null
  profile_image_url?: string | null
}

/**
 * Pinterest settings card. Wraps PlatformCard for the standard connect/disconnect UX and
 * adds a "Manage boards" affordance (board sync + default board) once connected.
 */
export function PinterestCard({
  channels,
  connectHref,
  onDisconnect,
}: {
  channels: PinterestChannel[]
  connectHref: string
  onDisconnect: (id: string) => void
}) {
  const [boardChannelId, setBoardChannelId] = useState<string | null>(null)

  const accounts: ConnectedAccount[] = channels.map((c) => ({
    id:              c.id,
    label:           c.label ?? 'Connected account',
    accountType:     c.account_type,
    tokenExpiresAt:  c.token_expires_at,
    reconnectHref:   connectHref,
    profileImageUrl: c.profile_image_url ?? undefined,
  }))

  return (
    <div>
      <PlatformCard
        name="Pinterest"
        tagline="Visual discovery · durable traffic"
        iconColorClass="text-[#E60023]"
        icon={<PinterestIcon className="h-5 w-5" />}
        connected={accounts}
        connectHref={connectHref}
        connectLabel="Connect Pinterest"
        onDisconnect={onDisconnect}
        addAnotherHref={connectHref}
        addAnotherLabel="Add another Pinterest account"
        infoNote="Pins need an image and a destination link. Set a default board after connecting."
      />
      {channels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setBoardChannelId(c.id)}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Manage boards{channels.length > 1 ? ` · ${c.label ?? c.id}` : ''}
            </button>
          ))}
        </div>
      )}
      {boardChannelId && (
        <PinterestBoardModal channelId={boardChannelId} onClose={() => setBoardChannelId(null)} />
      )}
    </div>
  )
}
