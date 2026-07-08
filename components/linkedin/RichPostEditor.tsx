'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { Bold as BoldIcon, Italic as ItalicIcon } from 'lucide-react'
import { docFromPlainText, docToPlainText, sanitizeTiptapDoc, type TiptapDoc } from '@/lib/linkedin/richText'

// A mention node whose JSON attrs are exactly `{ name, id }` — so editor output
// maps 1:1 onto the richText contract with no translation layer.
const MentionNode = Mention.extend({
  addAttributes() {
    return {
      name: { default: '' },
      id: { default: null },
    }
  },
  renderText({ node }) {
    return '@' + (node.attrs.name ?? '')
  },
})

interface MentionPopup {
  query: string
  top: number
  left: number
  items: string[]
  command: (attrs: { name: string; id: null }) => void
}

interface RichPostEditorProps {
  value: TiptapDoc | null
  plainFallback: string
  /** Change this to force the editor to reload `value` (variation switch, AI transform). */
  resetKey: string | number
  onChange: (v: { doc: TiptapDoc; plainText: string }) => void
  /** Optional local names offered in the @ popup (v1 has no LinkedIn entity search). */
  mentionSuggestions?: string[]
}

export function RichPostEditor({
  value,
  plainFallback,
  resetKey,
  onChange,
  mentionSuggestions = [],
}: RichPostEditorProps) {
  const [popup, setPopup] = useState<MentionPopup | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const suggestionsRef = useRef(mentionSuggestions)
  suggestionsRef.current = mentionSuggestions

  const editor = useEditor({
    immediatelyRender: false, // avoid SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
      MentionNode.configure({
        HTMLAttributes: { class: 'rounded bg-blue-50 px-1 text-[#0a66c2]' },
        suggestion: {
          char: '@',
          items: ({ query }: { query: string }) =>
            suggestionsRef.current
              .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5),
          render: () => {
            const toState = (props: {
              query: string
              items: string[]
              clientRect?: (() => DOMRect | null) | null
              command: (attrs: { name: string; id: null }) => void
            }): MentionPopup | null => {
              const rect = props.clientRect?.()
              if (!rect) return null
              return {
                query: props.query,
                top: rect.bottom + 4,
                left: rect.left,
                items: props.items,
                command: props.command,
              }
            }
            return {
              onStart: (props: Parameters<typeof toState>[0]) => setPopup(toState(props)),
              onUpdate: (props: Parameters<typeof toState>[0]) => setPopup(toState(props)),
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === 'Escape') {
                  setPopup(null)
                  return true
                }
                if (props.event.key === 'Enter') {
                  // Free entry: commit the typed name as a plain text mention.
                  setPopup((p) => {
                    if (p && p.query.trim()) p.command({ name: p.query.trim(), id: null })
                    return null
                  })
                  return true
                }
                return false
              },
              onExit: () => setPopup(null),
            }
          },
        },
      }),
    ],
    content: value ?? docFromPlainText(plainFallback),
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[140px] text-sm leading-relaxed text-zinc-900 outline-none focus:ring-0 whitespace-pre-wrap [&_strong]:font-semibold',
      },
    },
    onUpdate: ({ editor }) => {
      const doc = sanitizeTiptapDoc(editor.getJSON())
      onChangeRef.current({ doc, plainText: docToPlainText(doc) })
    },
  })

  // Reload content only on an explicit reset (variation switch / AI transform) —
  // never on every keystroke, which would fight the caret.
  const lastReset = useRef(resetKey)
  useEffect(() => {
    if (!editor) return
    if (lastReset.current === resetKey) return
    lastReset.current = resetKey
    editor.commands.setContent(value ?? docFromPlainText(plainFallback))
  }, [editor, resetKey, value, plainFallback])

  if (!editor) return null

  return (
    <div className="relative">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {popup && (
        <div
          className="fixed z-50 min-w-[180px] rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg"
          style={{ top: popup.top, left: popup.left }}
        >
          {popup.items.map((name) => (
            <button
              key={name}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-100"
              onMouseDown={(e) => {
                e.preventDefault()
                popup.command({ name, id: null })
                setPopup(null)
              }}
            >
              @{name}
            </button>
          ))}
          {popup.query.trim() && !popup.items.includes(popup.query.trim()) && (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-zinc-500 hover:bg-zinc-100"
              onMouseDown={(e) => {
                e.preventDefault()
                popup.command({ name: popup.query.trim(), id: null })
                setPopup(null)
              }}
            >
              Insert “@{popup.query.trim()}” as text
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    [
      'flex h-7 w-7 items-center justify-center rounded transition-colors',
      active ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
    ].join(' ')
  return (
    <div className="mb-2 flex items-center gap-1 border-b border-zinc-100 pb-2">
      <button
        type="button"
        aria-label="Bold"
        aria-pressed={editor.isActive('bold')}
        className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Italic"
        aria-pressed={editor.isActive('italic')}
        className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="h-3.5 w-3.5" />
      </button>
      <span className="ml-1 text-[10px] text-zinc-400" title="Publishes as plain text unless LinkedIn entity resolution is enabled">
        Type @ to insert a text mention
      </span>
    </div>
  )
}
