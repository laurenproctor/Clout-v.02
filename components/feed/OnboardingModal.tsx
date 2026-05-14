'use client'

import { useState, useEffect } from 'react'
import { tokens } from '@/lib/feed/tokens'

const STORAGE_KEY = 'clout_feed_onboarding_complete'

const STEPS = [
  {
    title: 'Your signal intelligence feed',
    body: 'Clout surfaces emerging narratives from GDELT\'s global media index — ranked by opportunity, not just trending volume. Every card is a strategic briefing.',
  },
  {
    title: 'Three types of opportunity',
    body: 'News signals show what\'s emerging in your niche. Focus Areas match signals to the services you offer. Emerging Frameworks surface conceptual territory before it saturates.',
  },
  {
    title: 'Competitive Landscape',
    body: 'See what your competitors are — and aren\'t — covering. The highest-value signals are those with strong momentum and zero competitor coverage. That\'s your window.',
  },
  {
    title: 'Claim your angle',
    body: 'Every signal has a "Draft a perspective" button. The AI drafts a differentiated take — not a summary of what everyone already knows. You edit, you publish, you own the territory.',
  },
]

interface OnboardingModalProps {
  userId: string
}

export function OnboardingModal({ userId }: OnboardingModalProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const done = sessionStorage.getItem(STORAGE_KEY)
      if (!done || done !== 'true') setVisible(true)
    } catch {
      // sessionStorage unavailable (SSR guard)
    }
  }, [])

  if (!visible) return null

  const isLast = step === STEPS.length - 1
  const progressPct = ((step + 1) / STEPS.length) * 100

  async function handleComplete() {
    setSubmitting(true)
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
    } catch {
      // Non-blocking — proceed regardless
    } finally {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setSubmitting(false)
      setVisible(false)
    }
  }

  function handleNext() {
    if (isLast) {
      handleComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const current = STEPS[step]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        maxWidth: '440px',
        width: '100%',
        overflow: 'hidden',
      }}>
        {/* Progress bar */}
        <div style={{ height: '3px', backgroundColor: '#f3f4f6' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: '#1a1560',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          {/* Step indicator */}
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: tokens.colors.sectionHeaderColor,
            marginBottom: '12px',
          }}>
            {step + 1} of {STEPS.length}
          </p>

          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '10px',
            lineHeight: '1.3',
          }}>
            {current.title}
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#374151',
            lineHeight: '1.65',
            marginBottom: '24px',
          }}>
            {current.body}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {STEPS.map((_, i) => (
              <span key={i} style={{
                width: i === step ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: i === step ? '#1a1560' : '#e5e7eb',
                transition: 'width 0.2s ease, background-color 0.2s ease',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: tokens.colors.sectionHeaderColor,
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={submitting}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: submitting ? '#9ca3af' : '#1a1560',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting ? 'default' : 'pointer',
                transition: 'background-color 0.1s',
              }}
            >
              {isLast ? (submitting ? 'Starting…' : 'Enter the feed') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
