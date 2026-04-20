'use client'

import { useEffect, useState } from 'react'

type EmailType = 'welcome' | 'output_ready' | 'payment_failed'
type ViewMode = 'html' | 'text'

interface FailedEvent {
  id: string
  type: string
  recipient_email: string
  status: string
  error: string | null
  attempt_count: number
  created_at: string
}

interface PreviewContent {
  html: string
  text: string
}

const TABS: { key: EmailType; label: string }[] = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'output_ready', label: 'Output Ready' },
  { key: 'payment_failed', label: 'Payment Failed' },
]

export default function EmailPreviewPage() {
  const [active, setActive] = useState<EmailType>('welcome')
  const [view, setView] = useState<ViewMode>('html')
  const [previews, setPreviews] = useState<Record<EmailType, PreviewContent>>({
    welcome: { html: '', text: '' },
    output_ready: { html: '', text: '' },
    payment_failed: { html: '', text: '' },
  })
  const [failedEvents, setFailedEvents] = useState<FailedEvent[]>([])
  const [resending, setResending] = useState<string | null>(null)

  useEffect(() => {
    // Render previews client-side to avoid server-side React Email import issues
    async function loadPreviews() {
      const appUrl = window.location.origin

      const [
        { renderHtml: welcomeHtml, renderText: welcomeText },
        { renderHtml: outputReadyHtml, renderText: outputReadyText },
        { renderHtml: paymentFailedHtml, renderText: paymentFailedText },
      ] = await Promise.all([
        import('@/lib/email/templates/welcome'),
        import('@/lib/email/templates/output-ready'),
        import('@/lib/email/templates/payment-failed'),
      ])

      const [wHtml, oHtml, pHtml] = await Promise.all([
        welcomeHtml({ displayName: 'Alex Johnson', appUrl }),
        outputReadyHtml({
          outputId: 'preview-id',
          outputTitle: 'Why the best leaders think in systems, not tasks',
          outputBody: 'Most leaders are optimizing the wrong thing. They obsess over task completion when they should be designing feedback loops.\n\nA system that surfaces the right information at the right time is worth more than a hundred well-executed tasks.',
          appUrl,
        }),
        paymentFailedHtml({ planName: 'Pro', amount: 4900, currency: 'usd', gracePeriodDays: 3, appUrl }),
      ])

      setPreviews({
        welcome: { html: wHtml, text: welcomeText({ displayName: 'Alex Johnson', appUrl }) },
        output_ready: {
          html: oHtml,
          text: outputReadyText({
            outputId: 'preview-id',
            outputTitle: 'Why the best leaders think in systems, not tasks',
            outputBody: 'Most leaders are optimizing the wrong thing.',
            appUrl,
          }),
        },
        payment_failed: {
          html: pHtml,
          text: paymentFailedText({ planName: 'Pro', amount: 4900, currency: 'usd', gracePeriodDays: 3, appUrl }),
        },
      })
    }

    loadPreviews()

    fetch('/api/operator/email-events?status=failed')
      .then(r => r.ok ? r.json() : [])
      .then(setFailedEvents)
  }, [])

  async function handleResend(eventId: string) {
    setResending(eventId)
    await fetch('/api/email-events/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    setResending(null)
    setFailedEvents(prev => prev.filter(e => e.id !== eventId))
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Email Templates</h1>

      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              active === tab.key
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['html', 'text'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              view === v
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
            }`}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {view === 'html' ? (
        <iframe
          srcDoc={previews[active].html}
          className="w-full h-[600px] border border-zinc-200 rounded"
          sandbox="allow-same-origin"
          title={`${active} email preview`}
        />
      ) : (
        <pre className="w-full h-[600px] overflow-auto border border-zinc-200 rounded bg-zinc-50 p-6 text-sm text-zinc-700 whitespace-pre-wrap">
          {previews[active].text}
        </pre>
      )}

      {failedEvents.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Failed Sends</h2>
          <div className="space-y-2">
            {failedEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 border border-zinc-200 rounded">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{event.recipient_email}</p>
                  <p className="text-xs text-zinc-500">
                    {event.type} · {event.attempt_count} attempt{event.attempt_count !== 1 ? 's' : ''} · {new Date(event.created_at).toLocaleString()}
                  </p>
                  {event.error && <p className="text-xs text-red-600 mt-1">{event.error}</p>}
                </div>
                <button
                  onClick={() => handleResend(event.id)}
                  disabled={resending === event.id}
                  className="px-3 py-1 text-xs border border-zinc-200 text-zinc-700 rounded hover:border-zinc-400 transition-colors disabled:opacity-50"
                >
                  {resending === event.id ? 'Resending\u2026' : 'Resend'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
