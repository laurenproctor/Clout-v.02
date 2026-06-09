'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

const FAQS: [string, string][] = [
  ['What is Clout?', 'Clout is a hybrid content creation platform that transforms your raw thoughts — voice notes, ideas, and notes — into ready-to-publish content. We blend AI precision with human insight to help individuals and teams create smarter, more authentic thought leadership at scale.'],
  ['On what channels can I post my content?', 'Social platforms like LinkedIn, Instagram, and TikTok, plus blog posts, podcasts, video, and newsletters (owned or on Substack).'],
  ['Can I use Clout with my team?', "Absolutely. Invite collaborators to upload notes, review drafts, or co-publish. You can even extend your capacity by tapping into Clout's network of editors, strategists, and creative partners."],
  ['What kind of content can I create?', 'Blog posts, newsletters, video or podcast scripts, and social content — everything connects back to your core ideas, so your presence stays consistent across platforms.'],
]

export default function SupportPage() {
  const [open, setOpen] = useState(0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 text-center md:px-10 md:pt-24">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-8" style={{ color: 'var(--brand-muted-text)' }}>
          Support
        </p>
        <h1 className="text-[36px] leading-[1.05] tracking-[-0.02em] mb-6 md:text-[56px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
          How can we help?
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto" style={{ color: 'var(--brand-muted-text)' }}>
          Answers to common questions — and a direct line to the team when you need one.
        </p>
      </section>

      {/* FAQ */}
      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-2xl px-5 md:px-10">
          <div className="mb-11">
            {FAQS.map(([q, a], i) => (
              <div key={q} style={{ borderBottom: '1px solid var(--brand-border-light)' }}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-5 py-5 text-left"
                >
                  <span className="text-[19px] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                    {q}
                  </span>
                  <span
                    className="text-2xl leading-none transition-transform"
                    style={{ color: 'var(--brand-olive)', transform: open === i ? 'rotate(45deg)' : 'none' }}
                  >
                    +
                  </span>
                </button>
                <div className="overflow-hidden transition-all" style={{ maxHeight: open === i ? 240 : 0 }}>
                  <p className="pb-5 text-[15px] leading-[1.7]" style={{ color: 'var(--brand-muted-text)' }}>
                    {a}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Still need help */}
          <div
            className="flex flex-col items-start gap-3 p-7"
            style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)', boxShadow: '0 2px 6px rgba(33,33,15,0.07)' }}
          >
            <h3 className="text-[24px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
              Still need a hand?
            </h3>
            <p className="text-[16px] leading-[1.6]" style={{ color: 'var(--brand-muted-text)' }}>
              Email{' '}
              <a href="mailto:support@clout.you" className="font-semibold" style={{ color: 'var(--brand-olive)' }}>
                support@clout.you
              </a>{' '}
              and a member of our team will get back to you.
            </p>
            <Link
              href="/contact"
              className="mt-1 px-7 py-3 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--brand-olive)', color: 'var(--brand-olive)' }}
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
