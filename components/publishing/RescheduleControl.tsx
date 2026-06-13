'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  outputId: string
  /** Current scheduled time (ISO) to prefill the picker, if any. */
  initialScheduledAt?: string | null
  /** Called with the new ISO scheduled time after a successful reschedule. */
  onRescheduled: (scheduledAt: string) => void
}

// Converts an ISO timestamp to the `YYYY-MM-DDTHH:mm` shape a datetime-local
// input expects, in the user's local timezone.
function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function RescheduleControl({
  open,
  onOpenChange,
  outputId,
  initialScheduledAt,
  onRescheduled,
}: Props) {
  const [value, setValue] = useState(
    initialScheduledAt ? toLocalInputValue(initialScheduledAt) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!value) return
    setSaving(true)
    setError(null)
    // datetime-local has no timezone — convert the local value to an ISO string
    // so the API never has to infer a timezone.
    const iso = new Date(value).toISOString()
    const res = await fetch(`/api/outputs/${outputId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: iso }),
    })
    if (res.ok) {
      const data = await res.json()
      onRescheduled(data.scheduledAt as string)
      onOpenChange(false)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to reschedule.')
    }
    setSaving(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
          <Dialog.Title className="text-base font-semibold text-zinc-900">
            Reschedule post
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-zinc-500">
            Pick a new time. It will snap to the next available posting slot.
          </Dialog.Description>

          <div className="mt-4">
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Dialog.Close
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              Cancel
            </Dialog.Close>
            <button
              onClick={() => void handleConfirm()}
              disabled={saving || !value}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Reschedule'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
