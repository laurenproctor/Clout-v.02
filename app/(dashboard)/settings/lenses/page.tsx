'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Trash2, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'

export default function LensesPage() {
  const [lenses, setLenses] = useState<Lens[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)

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

  async function generateArchitecture() {
    if (!name.trim()) return
    setGeneratingPrompt(true)
    try {
      const res = await fetch('/api/lenses/generate-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) {
        const data = await res.json()
        setSystemPrompt(data.system_prompt)
      }
    } finally {
      setGeneratingPrompt(false)
    }
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
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1
            className="text-3xl text-zinc-900 leading-tight"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Editorial Lenses
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-lg leading-relaxed">
            Apply structured editorial perspectives that influence how Clout interprets and develops ideas.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 shrink-0 rounded bg-zinc-900 px-4 py-2 text-xs font-medium tracking-wide text-white hover:bg-zinc-700 transition-colors uppercase"
          >
            <Plus className="h-3 w-3" />
            Create Editorial Lens
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-sm border border-zinc-200 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <p
              className="text-base text-zinc-900"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
            >
              Create Editorial Lens
            </p>
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetForm() }}
              className="text-zinc-300 hover:text-zinc-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
                  Lens Name <span className="text-zinc-300">*</span>
                </label>
                <input
                  autoFocus
                  className="w-full rounded-sm border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                  placeholder="e.g. Contrarian Take"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
                  Perspective
                </label>
                <input
                  className="w-full rounded-sm border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                  placeholder="Describe the perspective this lens introduces"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                  Reasoning Architecture <span className="text-zinc-300">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateArchitecture}
                  disabled={!name.trim() || generatingPrompt}
                  className={cn(
                    'flex items-center gap-1 text-[10px] uppercase tracking-widest transition-colors',
                    !name.trim() || generatingPrompt
                      ? 'text-zinc-300 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-zinc-700'
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  {generatingPrompt ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                Establish the analytical perspective, narrative priorities, and communication patterns this lens applies.
              </p>
              <textarea
                className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors resize-y min-h-[180px] leading-relaxed"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                placeholder="Prioritize non-consensus interpretations, structural asymmetries, and second-order effects. Surface tensions between public narratives and underlying incentives. Favor intellectually differentiated positions over broadly accepted framing."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
                Editorial Traits
              </label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 min-h-[42px] focus-within:border-zinc-400 focus-within:bg-white transition-colors">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-sm border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-zinc-300 hover:text-zinc-600 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="text-xs text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent min-w-[120px] flex-1 uppercase tracking-widest"
                  placeholder="Add trait..."
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

            {createError && (
              <p className="text-xs text-red-600">{createError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetForm() }}
                className="text-xs text-zinc-400 hover:text-zinc-700 uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim() || !systemPrompt.trim()}
                className={cn(
                  'rounded-sm px-5 py-2 text-xs font-medium uppercase tracking-widest transition-colors',
                  creating || !name.trim() || !systemPrompt.trim()
                    ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                )}
              >
                {creating ? 'Deploying...' : 'Deploy Lens'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lens lists */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-sm border border-zinc-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Workspace lenses */}
          {workspaceLenses.length > 0 && (
            <section>
              <SectionLabel>Your Editorial Lenses</SectionLabel>
              <div className="rounded-sm border border-zinc-200 bg-white overflow-hidden">
                {workspaceLenses.map((lens) => (
                  <div key={lens.id}>
                    <LensRow
                      lens={lens}
                      onDelete={async () => {
                        const res = await fetch(`/api/lenses/${lens.id}`, { method: 'DELETE' })
                        if (res.ok) setLenses((prev) => prev.filter((l) => l.id !== lens.id))
                      }}
                      onEdit={() => setEditingId(editingId === lens.id ? null : lens.id)}
                      editOpen={editingId === lens.id}
                    />
                    {editingId === lens.id && (
                      <EditLensForm
                        lens={lens}
                        onSaved={(updated) => {
                          setLenses((prev) => prev.map((l) => l.id === lens.id ? updated : l))
                          setEditingId(null)
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* System lenses */}
          {systemLenses.length > 0 && (
            <section>
              <SectionLabel suffix="✦">Core Editorial Lenses</SectionLabel>
              <div className="rounded-sm border border-zinc-200 bg-white overflow-hidden">
                {systemLenses.map((lens) => (
                  <LensRow key={lens.id} lens={lens} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {lenses.length === 0 && (
            <div className="rounded-sm border border-zinc-100 bg-white">
              <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <p
                  className="text-xl text-zinc-900 mb-2"
                  style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
                >
                  No editorial lenses configured
                </p>
                <p className="text-sm text-zinc-400 max-w-sm leading-relaxed mb-6">
                  Build your intelligence layer. Define the analytical perspectives and reasoning structures that shape how your ideas are developed.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-sm bg-zinc-900 px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white hover:bg-zinc-700 transition-colors"
                >
                  Create Editorial Lens
                </button>
              </div>
            </div>
          )}

          {workspaceLenses.length === 0 && systemLenses.length > 0 && !showCreate && (
            <p className="text-xs text-zinc-400 tracking-wide">
              Create your own editorial lenses above to extend these built-in perspectives.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children, suffix }: { children: React.ReactNode; suffix?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 shrink-0">
        {children}
        {suffix && <span className="ml-1.5" style={{ color: 'var(--brand-gold)' }}>{suffix}</span>}
      </p>
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  )
}

function LensRow({
  lens,
  onDelete,
  onEdit,
  editOpen,
}: {
  lens: Lens
  onDelete?: () => void
  onEdit?: () => void
  editOpen?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-zinc-50 last:border-0">
      <div className="flex w-full items-center gap-3 px-6 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium text-zinc-900 shrink-0">
              {lens.name}
              {lens.scope === 'system' && (
                <span className="ml-1.5" style={{ color: 'var(--brand-gold)' }}>✦</span>
              )}
            </p>
            {lens.tags.length > 0 &&
              lens.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400"
                >
                  {tag}
                </span>
              ))}
          </div>
          {lens.description && (
            <p className="mt-1 text-xs text-zinc-400 line-clamp-1 leading-relaxed">{lens.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lens.scope === 'workspace' && onDelete && (
            <button
              onClick={onDelete}
              className="text-zinc-200 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded ? 'rotate-180' : '')}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 px-6 py-5 bg-zinc-50/50">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              Reasoning Architecture
            </p>
            {lens.scope === 'workspace' && onEdit && (
              <button
                onClick={onEdit}
                className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                {editOpen ? 'Close Edit' : 'Edit'}
              </button>
            )}
          </div>
          <pre
            className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap break-words"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          >
            {lens.systemPrompt}
          </pre>
        </div>
      )}
    </div>
  )
}

function EditLensForm({
  lens,
  onSaved,
  onCancel,
}: {
  lens: { id: string; name: string; description: string | null; systemPrompt: string; tags: string[] }
  onSaved: (updated: Lens) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(lens.name)
  const [description, setDescription] = useState(lens.description ?? '')
  const [systemPrompt, setSystemPrompt] = useState(lens.systemPrompt)
  const [saving, setSaving] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateArchitecture() {
    if (!name.trim()) return
    setGeneratingPrompt(true)
    try {
      const res = await fetch('/api/lenses/generate-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) {
        const data = await res.json()
        setSystemPrompt(data.system_prompt)
      }
    } finally {
      setGeneratingPrompt(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/lenses/${lens.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        system_prompt: systemPrompt.trim(),
      }),
    })

    if (res.ok) {
      onSaved(await res.json())
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="border-t border-zinc-100 px-6 py-5 bg-zinc-50/60 space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
            Lens Name
          </label>
          <input
            autoFocus
            className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
            Perspective
          </label>
          <input
            className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the perspective this lens introduces"
          />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Reasoning Architecture
          </label>
          <button
            type="button"
            onClick={generateArchitecture}
            disabled={!name.trim() || generatingPrompt}
            className={cn(
              'flex items-center gap-1 text-[10px] uppercase tracking-widest transition-colors',
              !name.trim() || generatingPrompt
                ? 'text-zinc-300 cursor-not-allowed'
                : 'text-zinc-400 hover:text-zinc-700'
            )}
          >
            <Sparkles className="h-3 w-3" />
            {generatingPrompt ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        <textarea
          className="w-full rounded-sm border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none transition-colors resize-y min-h-[140px] leading-relaxed"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-zinc-900 px-5 py-2 text-xs font-medium uppercase tracking-widest text-white hover:bg-zinc-700 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
