'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'

export default function LensesPage() {
  const [lenses, setLenses] = useState<Lens[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/lenses')
    if (res.ok) setLenses(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  function resetForm() {
    setName('')
    setDescription('')
    setSystemPrompt('')
    setTags([])
    setTagInput('')
    setCreateError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) return
    setCreating(true)
    setCreateError(null)

    const res = await fetch('/api/lenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || undefined,
        system_prompt: systemPrompt,
        tags,
      }),
    })

    if (res.ok) {
      const newLens = await res.json()
      setLenses((prev) => [newLens, ...prev])
      setShowCreate(false)
      resetForm()
    } else {
      const data = await res.json()
      setCreateError(data.error ?? 'Failed to create lens')
    }
    setCreating(false)
  }

  const systemLenses = lenses.filter((l) => l.scope === 'system')
  const workspaceLenses = lenses.filter((l) => l.scope === 'workspace')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Lenses</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Perspective templates that shape your generated content.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Lens
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-zinc-900 bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">New lens</h2>
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetForm() }}
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Name *
              </label>
              <input
                autoFocus
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                placeholder="e.g. Contrarian Take"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Description
              </label>
              <input
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                placeholder="One line description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              System prompt *
            </label>
            <p className="text-xs text-zinc-400 mt-0.5 mb-1.5">
              Instructions that shape how Claude generates content from this perspective.
            </p>
            <textarea
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none min-h-[140px] resize-y leading-relaxed"
              placeholder="You are helping a thought leader take a contrarian stance on a topic. Challenge the conventional wisdom, find the non-obvious angle, and make the reader reconsider their assumptions..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Tags
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 min-h-[38px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="ml-0.5 text-zinc-400 hover:text-zinc-700"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent min-w-[100px] flex-1"
                placeholder="Add tags..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag(tagInput)
                  }
                }}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
              />
            </div>
          </div>

          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetForm() }}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim() || !systemPrompt.trim()}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                creating || !name.trim() || !systemPrompt.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              {creating ? 'Creating...' : 'Create lens'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspace lenses */}
          {workspaceLenses.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Your lenses
              </p>
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
                {workspaceLenses.map((lens) => (
                  <LensRow
                    key={lens.id}
                    lens={lens}
                    expanded={expandedId === lens.id}
                    onToggle={() => setExpandedId(expandedId === lens.id ? null : lens.id)}
                    onDelete={async () => {
                      const res = await fetch(`/api/lenses/${lens.id}`, { method: 'DELETE' })
                      if (res.ok) setLenses((prev) => prev.filter((l) => l.id !== lens.id))
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* System lenses */}
          {systemLenses.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                System lenses ✦
              </p>
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
                {systemLenses.map((lens) => (
                  <LensRow
                    key={lens.id}
                    lens={lens}
                    expanded={expandedId === lens.id}
                    onToggle={() => setExpandedId(expandedId === lens.id ? null : lens.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state — no workspace lenses and no system lenses */}
          {lenses.length === 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white">
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <Layers className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-900">No lenses yet</p>
                <p className="mt-1 max-w-sm text-sm text-zinc-500">
                  Lenses are the perspectives that shape your content. Create one to get started.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
                >
                  Create your first lens
                </button>
              </div>
            </div>
          )}

          {/* Empty workspace lenses, but system lenses exist */}
          {workspaceLenses.length === 0 && systemLenses.length > 0 && !showCreate && (
            <p className="text-xs text-zinc-400">
              Create your own lenses above to add them to the list alongside system lenses.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function LensRow({
  lens,
  expanded,
  onToggle,
  onDelete,
}: {
  lens: Lens
  expanded: boolean
  onToggle: () => void
  onDelete?: () => void
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900">
              {lens.name}
              {lens.scope === 'system' && (
                <span className="ml-1.5 text-zinc-400">✦</span>
              )}
            </p>
            {lens.tags.length > 0 &&
              lens.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-100 px-2 py-0.5 text-xs text-zinc-400"
                >
                  {tag}
                </span>
              ))}
          </div>
          {lens.description && (
            <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{lens.description}</p>
          )}
        </div>
        {lens.scope === 'workspace' && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
            System prompt
          </p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
            {lens.systemPrompt}
          </p>
        </div>
      )}
    </div>
  )
}
