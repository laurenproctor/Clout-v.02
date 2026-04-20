'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Lens {
  id: string
  name: string
  description: string | null
  system_prompt: string
  tags: string[]
  is_active: boolean
}

export default function OperatorLensesPage() {
  const [lenses, setLenses] = useState<Lens[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/operator/lenses')
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
    setName(''); setDescription(''); setSystemPrompt('')
    setTags([]); setTagInput(''); setCreateError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) return
    setCreating(true)
    setCreateError(null)

    const res = await fetch('/api/operator/lenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined, system_prompt: systemPrompt, tags }),
    })

    if (res.ok) {
      const lens = await res.json()
      setLenses((prev) => [...prev, lens])
      setShowCreate(false)
      resetForm()
    } else {
      const data = await res.json()
      setCreateError(data.error ?? 'Failed to create lens')
    }
    setCreating(false)
  }

  async function handleToggleActive(lens: Lens) {
    const res = await fetch(`/api/operator/lenses/${lens.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !lens.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setLenses((prev) => prev.map((l) => l.id === lens.id ? updated : l))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this system lens? This will remove it from all workspaces.')) return
    const res = await fetch(`/api/operator/lenses/${id}`, { method: 'DELETE' })
    if (res.ok) setLenses((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">System Lenses</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Manage lenses available to all workspaces.
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
        <form onSubmit={handleCreate} className="rounded-lg border border-zinc-900 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">New system lens</h2>
            <button type="button" onClick={() => { setShowCreate(false); resetForm() }}>
              <X className="h-4 w-4 text-zinc-400 hover:text-zinc-700" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Name *</label>
              <input
                autoFocus required
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                placeholder="e.g. Contrarian Take"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Description</label>
              <input
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                placeholder="One-line description"
                value={description} onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">System prompt *</label>
            <textarea
              required
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none min-h-[140px] resize-y"
              placeholder="You are helping a thought leader..."
              value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tags</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 min-h-[38px]">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700">
                  {tag}
                  <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="ml-0.5 text-zinc-400 hover:text-zinc-700">×</button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[100px] text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent"
                placeholder="Add tags..."
                value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
              />
            </div>
          </div>

          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowCreate(false); resetForm() }}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={creating || !name.trim() || !systemPrompt.trim()}
              className={cn('rounded-md px-4 py-2 text-sm font-medium transition-colors',
                creating || !name.trim() || !systemPrompt.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}>
              {creating ? 'Creating...' : 'Create lens'}
            </button>
          </div>
        </form>
      )}

      {/* Lens list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg border border-zinc-200 bg-white animate-pulse" />)}
        </div>
      ) : lenses.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Layers className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No system lenses yet</p>
            <p className="mt-1 text-sm text-zinc-500">Create a lens to make it available to all workspaces.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {lenses.map((lens) => (
            <div key={lens.id}>
              <div className="flex items-center gap-4 px-5 py-4">
                <button
                  onClick={() => setExpandedId(expandedId === lens.id ? null : lens.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">{lens.name} ✦</p>
                    {lens.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-zinc-100 px-2 py-0.5 text-xs text-zinc-400">{tag}</span>
                    ))}
                  </div>
                  {lens.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{lens.description}</p>
                  )}
                </button>
                <button
                  onClick={() => handleToggleActive(lens)}
                  className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    lens.is_active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  )}>
                  {lens.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(lens.id)}
                  className="shrink-0 text-xs text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
                {expandedId === lens.id
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />}
              </div>
              {expandedId === lens.id && (
                <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">System prompt</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{lens.system_prompt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
