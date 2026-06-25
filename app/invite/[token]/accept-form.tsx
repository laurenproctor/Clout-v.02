'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  workspaceSlug: string
  inviteEmail: string
}

export default function AcceptInviteForm({ token, inviteEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workspace/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        const { workspaceSlug: slug } = await res.json()
        router.push(`/${slug}/feed`)
      } else {
        const d = await res.json()
        if (res.status === 403) {
          setError(`This invitation was sent to ${inviteEmail}. Please sign in with that email address to accept.`)
        } else {
          setError(d.error ?? 'Failed to accept invitation')
        }
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-40"
      >
        {loading ? 'Accepting…' : 'Accept invitation'}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
