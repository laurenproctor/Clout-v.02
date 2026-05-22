'use client'

import { useState } from 'react'
import { TopicSelector } from './TopicSelector'
import { FocusAreaSelector } from './FocusAreaSelector'
import { CompetitorInput } from './CompetitorInput'
import { EditorialVoiceSelector } from './EditorialVoiceSelector'
import { mapVoicesToTone } from '@/lib/feed/toneMapping'
import type { OnboardingDraft, OnboardingPayload } from '@/types/feed'

const STEPS = [
  {
    headline: 'Where are you building authority?',
    subheadline: 'Clout maps emerging narrative territory across your domain — surfacing signals before they peak.',
  },
  {
    headline: 'Where should Clout look for asymmetric opportunity?',
    subheadline: 'Select the signal types that match your editorial strategy.',
  },
  {
    headline: 'Whose narratives compete for your audience\'s attention?',
    subheadline: 'Clout identifies narrative gaps your competitors have not yet addressed.',
  },
  {
    headline: 'How should Clout interpret and frame emerging signals?',
    subheadline: 'Select the editorial voices that reflect how you reason and communicate.',
  },
]

const STEP_LABELS = ['Topics', 'Focus Areas', 'Competitors', 'Voice'] as const

interface OnboardingFlowProps {
  userDisplayName: string
  onComplete: (payload: OnboardingPayload) => void
}

export function OnboardingFlow({ userDisplayName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [draft, setDraft] = useState<OnboardingDraft>({
    content_topics: [],
    services: [],
    competitors: [],
    editorial_voices: [],
  })

  const isValid = [
    draft.content_topics.length >= 3,
    draft.services.length >= 1,
    true, // competitors optional
    draft.editorial_voices.length >= 1,
  ][step]

  function handleNext() {
    if (step < 3) {
      setStep((s) => (s + 1) as 0 | 1 | 2 | 3)
    } else {
      handleComplete()
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => (s - 1) as 0 | 1 | 2 | 3)
  }

  function handleSkipCompetitors() {
    setDraft(d => ({ ...d, competitors: [] }))
    setStep(3)
  }

  function handleComplete() {
    onComplete({
      brand_name: userDisplayName.trim() || 'My Brand',
      niche: draft.content_topics.slice(0, 3).join(', '),
      services: draft.services,
      tone_preference: mapVoicesToTone(draft.editorial_voices),
      competitors: draft.competitors.map(name => ({ name, handle: '', url: '' })),
      content_topics: draft.content_topics,
    })
  }

  const current = STEPS[step]
  const isLastStep = step === 3

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes stepEnter {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      ` }} />

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8f8fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: '620px' }}>

          {/* Named step navigator */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            marginBottom: '32px',
          }}>
            {STEP_LABELS.map((label, index) => {
              const isActive = index === step
              const isVisited = index < step
              return (
                <button
                  key={label}
                  onClick={() => setStep(index as 0 | 1 | 2 | 3)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: isActive ? '#1a1560' : isVisited ? '#9ca3af' : '#e5e7eb',
                    marginBottom: '6px',
                  }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1a1560' : '#9ca3af',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    display: 'block',
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 8px',
            lineHeight: '1.25',
          }}>
            {current.headline}
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 28px',
            lineHeight: '1.6',
          }}>
            {current.subheadline}
          </p>

          {/* Step content — keyed so animation resets on step change */}
          <div key={step} style={{ animation: 'stepEnter 0.25s ease both' }}>
            {step === 0 && (
              <TopicSelector
                selected={draft.content_topics}
                onChange={topics => setDraft(d => ({ ...d, content_topics: topics }))}
              />
            )}
            {step === 1 && (
              <FocusAreaSelector
                selected={draft.services}
                onChange={services => setDraft(d => ({ ...d, services }))}
              />
            )}
            {step === 2 && (
              <CompetitorInput
                competitors={draft.competitors}
                onChange={competitors => setDraft(d => ({ ...d, competitors }))}
              />
            )}
            {step === 3 && (
              <EditorialVoiceSelector
                selected={draft.editorial_voices}
                onChange={voices => setDraft(d => ({ ...d, editorial_voices: voices }))}
              />
            )}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: step === 2 ? 'space-between' : 'flex-end',
            marginTop: '32px',
            gap: '10px',
          }}>
            {/* Back button */}
            {step > 0 && step !== 2 && (
              <button
                onClick={handleBack}
                style={{
                  marginRight: 'auto',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#6b7280',
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}

            {/* Step 2 layout: Back | Skip + Continue */}
            {step === 2 && (
              <>
                <button
                  onClick={handleBack}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#6b7280',
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSkipCompetitors}
                    style={{
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#6b7280',
                      background: 'none',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: '10px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#fff',
                      backgroundColor: '#1a1560',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Other steps: Continue / Build my feed */}
            {step !== 2 && (
              <button
                onClick={handleNext}
                disabled={!isValid}
                style={{
                  padding: '10px 28px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: isValid ? '#1a1560' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isValid ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isLastStep ? 'Activate Signal Intelligence' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
