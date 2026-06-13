'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
          <Dialog.Title className="text-base font-semibold text-zinc-900">
            {title}
          </Dialog.Title>
          {body && (
            <Dialog.Description className="mt-2 text-sm text-zinc-500">
              {body}
            </Dialog.Description>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Dialog.Close
              disabled={loading}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              {cancelLabel}
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition-colors',
                destructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-zinc-900 hover:bg-zinc-800'
              )}
            >
              {loading ? 'Working…' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
