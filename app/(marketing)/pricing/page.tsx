'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

type Plan = {
  name: string
  monthly: string
  annual: string
  annualSuffix: string
  description: string
  features: string[]
  featured?: boolean
  badge?: string
}

const PLANS: Plan[] = [
  {
    name: 'Lite',
    monthly: '$200',
    annual: '$2,160',
    annualSuffix: '/ year',
    description: 'Expand thought leadership seamlessly on a single social platform.',
    features: ['Transform', '100gb storage', '1 social channel'],
  },
  {
    name: 'Core',
    monthly: '$500',
    annual: '$5,400',
    annualSuffix: '/ year',
    description: 'Build reputation with augmented content on up to four social channels.',
    features: ['Up to 4 channels', '100gb storage', 'Unlimited bandwidth', 'Live chat support'],
    featured: true,
    badge: 'Popular',
  },
  {
    name: 'Pro',
    monthly: '$1,000',
    annual: '$10,800',
    annualSuffix: '/ year',
    description: 'Lead with consistent content that flexes to your creative rhythm.',
    features: ['Everything in Core', 'Unlimited designs', 'Premium themes', 'Free domain'],
  },
  {
    name: 'Elite',
    monthly: 'Call',
    annual: 'Call',
    annualSuffix: 'for pricing',
    description: 'Command attention with cutting-edge programs — news syndication, AI video, digital avatars.',
    features: ['Everything in Pro', 'News syndication', 'AI video & avatars', 'Dedicated team'],
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Header */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 text-center md:px-10 md:pt-24">
        <h1
          className="text-[36px] leading-[1.05] tracking-[-0.02em] mb-6 md:text-[56px]"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
        >
          Pricing Plans
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto mb-10" style={{ color: 'var(--brand-muted-text)' }}>
          Behind every great voice is a team who makes it louder. Get access to experienced marketers who shape
          your ideas into beautifully written and designed content.
        </p>

        {/* Billing toggle */}
        <div
          className="inline-flex items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5"
          style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)' }}
        >
          <span className="text-sm font-medium" style={{ color: annual ? 'var(--brand-muted-text)' : 'var(--brand-ink)' }}>
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setAnnual(!annual)}
            aria-label="Toggle annual billing"
            className="relative h-[30px] w-[52px] rounded-full transition-colors"
            style={{ background: annual ? 'var(--brand-olive)' : 'var(--brand-border-light)' }}
          >
            <span
              className="absolute top-[3px] h-6 w-6 rounded-full bg-white transition-all"
              style={{ left: annual ? 25 : 3, boxShadow: '0 2px 6px rgba(33,33,15,0.2)' }}
            />
          </button>
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: annual ? 'var(--brand-ink)' : 'var(--brand-muted-text)' }}>
              Annual
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(79,122,74,0.14)', color: '#4F7A4A' }}
            >
              Save 10%
            </span>
          </span>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16 md:pb-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-5 md:grid-cols-2 md:px-10 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="flex flex-col p-7"
              style={{
                background: 'var(--brand-paper)',
                border: p.featured ? '1.5px solid var(--brand-olive)' : '1px solid var(--brand-border-light)',
                boxShadow: p.featured ? '0 6px 20px rgba(33,33,15,0.08)' : '0 1px 2px rgba(33,33,15,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[24px] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {p.name}
                </h3>
                {(annual && p.name !== 'Elite' ? '10% off' : p.badge) && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={
                      p.featured
                        ? { background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }
                        : { background: 'var(--brand-surface)', color: 'var(--brand-ink)', border: '1px solid var(--brand-border-light)' }
                    }
                  >
                    {annual && p.name !== 'Elite' ? '10% off' : p.badge}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[40px] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {annual ? p.annual : p.monthly}
                </span>
                <span className="text-sm" style={{ color: 'var(--brand-muted-text)' }}>
                  {p.name === 'Elite' ? p.annualSuffix : annual ? p.annualSuffix : '/ month'}
                </span>
              </div>

              <p className="mt-3.5 min-h-[66px] text-[15px] leading-[1.55]" style={{ color: 'var(--brand-muted-text)' }}>
                {p.description}
              </p>

              <div className="my-5 h-px" style={{ background: 'var(--brand-border-light)' }} />

              <ul className="flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px]" style={{ color: 'var(--brand-ink)' }}>
                    <span style={{ color: '#4F7A4A', fontWeight: 700 }} aria-hidden>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={p.name === 'Elite' ? '/contact' : '/sign-up'}
                className="mt-6 w-full py-3 text-center text-sm font-medium transition-opacity hover:opacity-90"
                style={
                  p.featured
                    ? { background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }
                    : { background: 'var(--brand-paper)', color: 'var(--brand-olive)', border: '1px solid var(--brand-border-light)' }
                }
              >
                {p.name === 'Elite' ? 'Contact sales' : 'Get started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Closing band */}
      <section className="py-16 md:py-20" style={{ background: 'var(--brand-deep-navy)' }}>
        <div className="mx-auto max-w-2xl px-5 text-center md:px-10">
          <h2
            className="text-[28px] leading-[1.15] tracking-[-0.01em] mb-8 md:text-[36px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}
          >
            Get a behind-the-scenes look at the formula that supercharges thought leaders.
          </h2>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-paper-text)', color: 'var(--brand-ink)' }}
          >
            Get a demo →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
