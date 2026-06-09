'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function ContactPage() {
  const [sent, setSent] = useState(false)

  const field: React.CSSProperties = {
    width: '100%',
    fontSize: 16,
    color: 'var(--brand-ink)',
    background: 'var(--brand-paper)',
    border: '1px solid var(--brand-border-light)',
    padding: '12px 14px',
    outline: 'none',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-4 text-center md:px-10 md:pt-24">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-8" style={{ color: 'var(--brand-muted-text)' }}>
          Contact
        </p>
        <h1 className="text-[36px] leading-[1.05] tracking-[-0.025em] mb-6 md:text-[56px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
          Let&apos;s connect
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto" style={{ color: 'var(--brand-muted-text)' }}>
          Whether you&apos;re here to explore how we can help shape your ideas, discuss a partnership, or simply learn
          more about what we do, we&apos;d love to hear from you.
        </p>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-5 md:grid-cols-[0.85fr_1.15fr] md:px-10">
          {/* Get in touch */}
          <div className="flex flex-col gap-7">
            <h2 className="text-[24px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
              Get in touch
            </h2>
            {[
              ['hi@clout.you', 'For general inquiries, press, and partnership opportunities.'],
              ['support@clout.you', 'For client and platform support.'],
            ].map(([email, desc]) => (
              <div key={email} className="flex flex-col gap-1">
                <a href={`mailto:${email}`} className="text-[19px] font-bold" style={{ color: 'var(--brand-olive)' }}>
                  {email}
                </a>
                <span className="text-[15px]" style={{ color: 'var(--brand-muted-text)' }}>{desc}</span>
              </div>
            ))}
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--brand-muted-text)' }}>
                Connect on social
              </span>
              <div className="flex flex-wrap gap-4">
                {['Twitter', 'Facebook', 'Instagram', 'Pinterest'].map((s) => (
                  <Link key={s} href="#" className="text-[15px] font-semibold" style={{ color: 'var(--brand-olive)' }}>{s}</Link>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8" style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)', boxShadow: '0 6px 20px rgba(33,33,15,0.08)' }}>
            {sent ? (
              <div className="flex flex-col items-start gap-3 py-5">
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'rgba(79,122,74,0.14)', color: '#4F7A4A' }}>
                  ✓ Message sent
                </span>
                <h3 className="mt-2 text-[26px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  Thanks — we&apos;ll be in touch.
                </h3>
                <p className="text-[16px]" style={{ color: 'var(--brand-muted-text)' }}>
                  A member of the Clout team will reply to your note shortly.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                }}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                    First name
                    <input style={field} placeholder="Jane" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                    Last name
                    <input style={field} placeholder="Doe" />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                  Email
                  <input type="email" style={field} placeholder="you@company.com" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                  How can we help?
                  <textarea rows={4} style={{ ...field, resize: 'vertical' }} placeholder="Please let us know what's on your mind." />
                </label>
                <button
                  type="submit"
                  className="mt-1 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
                >
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="py-16 md:py-20 text-center" style={{ background: 'var(--brand-deep-navy)' }}>
        <div className="mx-auto max-w-2xl px-5 md:px-10">
          <h2 className="text-[28px] leading-[1.15] tracking-[-0.02em] mb-8 md:text-[36px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}>
            Your thoughts. Our polish. The world&apos;s attention.
          </h2>
          <Link href="/pricing" className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90" style={{ background: 'var(--brand-paper-text)', color: 'var(--brand-ink)' }}>
            Explore membership
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
