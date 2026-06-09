'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

const BENEFITS = [
  {
    eyebrow: 'Fuel business growth',
    lead: 'Standout content attracts high-value opportunities.',
    body: 'Activate strategic content that resonates with essential players and converts interest into investment.',
  },
  {
    eyebrow: 'Lead conversations',
    lead: 'Lenses engage your audience and steer the narrative.',
    body: "Unlock deeper insights and craft meaningful connections with Clout's proprietary AI workflows.",
  },
  {
    eyebrow: 'Build your brand',
    lead: 'Design services increase visibility and earn recognition.',
    body: 'Publish a steady stream of stunning content optimized to perform on each social network or digital channel.',
  },
]

const TOOLKIT = [
  ['Voice-to-Content Capture', 'Capture ideas on the go with a quick voice note. Clout transcribes, organizes, and refines your thoughts into usable drafts — no blank page required.'],
  ['Multi-Channel Publishing', 'One source of truth, many ways to share. Generate and adapt content for blogs, posts, newsletters, or scripts — all from a single idea.'],
  ['A Team at Your Fingertips', 'Invite collaborators, editors, or social managers to review and approve content. For teams without bandwidth, our creative partners jump in.'],
  ['Analytics-Driven Insights', "Track engagement, keyword performance, and audience sentiment. Clout's feedback loop helps you refine your message over time."],
]

const FAQS: [string, string][] = [
  ['What is Clout?', 'Clout is a hybrid content creation platform that transforms your raw thoughts — voice notes, ideas, and notes — into ready-to-publish content. We blend AI precision with human insight to help individuals and teams create smarter, more authentic thought leadership at scale.'],
  ['On what channels can I post my content?', 'Social platforms like LinkedIn, Instagram, and TikTok, plus blog posts, podcasts, video, and newsletters (owned or on Substack).'],
  ['Can I use Clout with my team?', "Absolutely. Invite collaborators to upload notes, review drafts, or co-publish. You can even extend your capacity by tapping into Clout's network of editors, strategists, and creative partners."],
  ['What kind of content can I create?', 'Blog posts, newsletters, video or podcast scripts, and social content — everything connects back to your core ideas, so your presence stays consistent across platforms.'],
]

export default function FeaturesPage() {
  const [open, setOpen] = useState(0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center md:px-10 md:py-28">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-10" style={{ color: 'var(--brand-muted-text)' }}>
          Features
        </p>
        <h1
          className="text-[32px] leading-[1.08] tracking-[-0.02em] mb-8 sm:text-[44px] md:text-[56px] md:leading-[1.05]"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
        >
          Your thoughts. Our polish.<br />The world&apos;s attention.
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto mb-12" style={{ color: 'var(--brand-muted-text)' }}>
          Clout makes the content creation process seamless, intuitive, and deeply human — turning
          off-the-cuff ideas into crafted content ready for LinkedIn, Instagram, TikTok, blogs, and more.
        </p>
        <Link
          href="/sign-up"
          className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
        >
          Get started
        </Link>
      </section>

      {/* Intro statement */}
      <section className="py-16 md:py-20" style={{ borderTop: '1px solid var(--brand-border-light)' }}>
        <div className="mx-auto max-w-3xl px-5 text-center md:px-10">
          <h2
            className="text-[28px] leading-[1.12] tracking-[-0.02em] mb-6 md:text-[40px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
          >
            Real reach. Real relevance. Real clout.
          </h2>
          <p className="text-[16px] leading-[1.7]" style={{ color: 'var(--brand-muted-text)' }}>
            Clout helps thought leaders grow, lead, and build with intention by transforming thought into
            measurable impact.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="pb-4 md:pb-8">
        <div className="mx-auto max-w-4xl px-5 md:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {BENEFITS.map(({ eyebrow, lead, body }) => (
              <div
                key={eyebrow}
                className="p-6 md:p-8"
                style={{
                  background: 'var(--brand-paper)',
                  border: '1px solid var(--brand-border-light)',
                  boxShadow: '0 2px 6px rgba(33, 33, 15, 0.07)',
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--brand-muted-text)' }}>
                  {eyebrow}
                </p>
                <h3
                  className="text-[20px] leading-[1.2] tracking-[-0.01em] mb-3"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
                >
                  {lead}
                </h3>
                <p className="text-sm leading-[1.8]" style={{ color: 'var(--brand-muted-text)' }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Toolkit — dark slate band */}
      <section className="mt-16 py-16 md:mt-20 md:py-20" style={{ background: 'var(--brand-slate)' }}>
        <div className="mx-auto max-w-4xl px-5 md:px-10">
          <div className="flex items-center gap-3 mb-12 md:mb-16">
            <p className="text-[10px] uppercase tracking-[0.14em] shrink-0" style={{ color: 'var(--brand-paper-muted)' }}>
              The toolkit
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-12">
            {TOOLKIT.map(([title, desc]) => (
              <div key={title}>
                <h3
                  className="text-[20px] leading-[1.2] tracking-[-0.01em] mb-3"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-[1.8]" style={{ color: 'var(--brand-paper-muted)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-5 md:px-10">
          <div className="flex items-center gap-3 mb-10">
            <p className="text-[10px] uppercase tracking-[0.14em] shrink-0" style={{ color: 'var(--brand-muted-text)' }}>
              FAQ
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--brand-border-light)' }} />
          </div>
          {FAQS.map(([q, a], i) => (
            <div key={q} style={{ borderBottom: '1px solid var(--brand-border-light)' }}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                className="flex w-full items-center justify-between gap-5 py-5 text-left"
              >
                <span className="text-[18px] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {q}
                </span>
                <span
                  className="text-2xl leading-none transition-transform"
                  style={{ color: 'var(--brand-olive)', transform: open === i ? 'rotate(45deg)' : 'none' }}
                >
                  +
                </span>
              </button>
              <div
                className="overflow-hidden transition-all"
                style={{ maxHeight: open === i ? 240 : 0 }}
              >
                <p className="pb-5 text-[15px] leading-[1.7]" style={{ color: 'var(--brand-muted-text)' }}>
                  {a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
