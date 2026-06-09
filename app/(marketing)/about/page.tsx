import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

const PHILOSOPHY: [string, string][] = [
  ['Clarity creates influence', 'Clarity is a form of integrity. While the world races to publish, Clout moves toward understanding. True influence grows not from volume but from vision — from ideas shaped carefully enough to outlast the scroll.'],
  ['Technology, at its best, is an art form', 'Technology amplifies ability, but intention defines meaning. Creation guided by empathy and design turns information into feeling. Craft gives every message its texture and humanity.'],
  ['Authenticity builds trust', 'Honesty gives ideas weight. Genuine voices have gravity. They connect, endure, and invite trust. Legacy belongs to the daring few who share their truth in original forms.'],
  ['Ideas should flow freely', 'The most powerful systems are invisible. Removing friction gives ideas room to move. When the process becomes lighter, expression becomes more powerful.'],
  ['Shape ideas that stand the test of time', 'People remember the ideas that move them. Meaning is multiplied when ideas are distilled and clarified. Added dimension gives ideas staying power, turning expression into legacy.'],
]

const PRINCIPLES: [string, string][] = [
  ['Value → Commitment', 'Everyone has something worth sharing. We are committed to helping them say it beautifully.'],
  ['Clarify →', 'We extract the gold and showcase your thoughts through the lens of your values, industry, and audience.'],
  ['Amplify →', 'We share your ideas as content for social networks, podcasts, newsletters, videos, and more.'],
]

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center md:px-10 md:py-28">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-10" style={{ color: 'var(--brand-muted-text)' }}>
          About Clout
        </p>
        <h1
          className="text-[32px] leading-[1.08] tracking-[-0.02em] mb-8 sm:text-[44px] md:text-[56px] md:leading-[1.05]"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
        >
          Thought leadership systematized
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto mb-12" style={{ color: 'var(--brand-muted-text)' }}>
          Expand authority and increase reach with Clout&apos;s strategy, editorial precision, and cross-platform
          optimization.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
        >
          Learn more
        </Link>
      </section>

      {/* Story */}
      <section className="py-16 md:py-20" style={{ borderTop: '1px solid var(--brand-border-light)' }}>
        <div className="mx-auto max-w-3xl px-5 md:px-10">
          <p className="text-[10px] uppercase tracking-[0.14em] mb-6" style={{ color: 'var(--brand-muted-text)' }}>
            Our story →
          </p>
          <h2
            className="text-[28px] leading-[1.15] tracking-[-0.02em] mb-6 md:text-[36px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
          >
            Where ideas find form
          </h2>
          <div className="flex flex-col gap-5 text-[16px] leading-[1.75]" style={{ color: 'var(--brand-muted-text)' }}>
            <p>
              Every day, brilliant thoughts disappear into the noise — lost in voice notes, texts, and fleeting
              moments of inspiration. We built this company to catch them before they vanish.
            </p>
            <p>
              Our work lives at the intersection of technology and craft. We take unstructured, off-the-cuff
              thinking and turn it into meaningful, finished content — essays that clarify your message, podcasts
              that capture your perspective, videos that move people, and posts that command attention. It&apos;s not
              automation for automation&apos;s sake. It&apos;s strategy and human intelligence, guided by AI, designed to
              help you sound more like yourself at your best.
            </p>
          </div>
        </div>
      </section>

      {/* Transform band */}
      <section className="py-16 md:py-20 text-center" style={{ background: 'var(--brand-slate)' }}>
        <div className="mx-auto max-w-2xl px-5 md:px-10">
          <h2
            className="text-[28px] leading-[1.15] tracking-[-0.02em] mb-5 md:text-[40px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}
          >
            Transform ideas into lasting impact
          </h2>
          <p className="text-[16px] leading-[1.7] mb-8" style={{ color: 'var(--brand-paper-muted)' }}>
            Clout turns your ideas into refined, resonant content to strengthen your credibility and expand your reach.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-paper-text)', color: 'var(--brand-ink)' }}
          >
            Get a demo
          </Link>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-10">
          <h2
            className="text-[28px] leading-[1.15] tracking-[-0.02em] mb-12 text-center md:text-[36px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
          >
            Our philosophy
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PHILOSOPHY.map(([title, body], i) => (
              <div
                key={title}
                className="p-6 md:p-7"
                style={{
                  background: 'var(--brand-paper)',
                  border: '1px solid var(--brand-border-light)',
                  boxShadow: '0 2px 6px rgba(33,33,15,0.07)',
                }}
              >
                <p className="mb-3 text-[13px] font-bold" style={{ color: 'var(--brand-olive)' }}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mb-3 text-[20px] leading-[1.2]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-[1.7]" style={{ color: 'var(--brand-muted-text)' }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-16 md:py-20" style={{ background: 'var(--brand-surface)' }}>
        <div className="mx-auto max-w-4xl px-5 md:px-10">
          <h2
            className="text-[20px] leading-[1.3] tracking-[-0.01em] mb-10 max-w-2xl"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-muted-text)' }}
          >
            Principles that dictate how we think, make decisions, and act.
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PRINCIPLES.map(([eyebrow, body]) => (
              <div key={eyebrow} className="pt-5" style={{ borderTop: '2px solid var(--brand-olive)' }}>
                <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--brand-olive)' }}>
                  {eyebrow}
                </p>
                <p className="text-[19px] leading-[1.3] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5 md:px-10">
          <p className="text-[10px] uppercase tracking-[0.14em] mb-6" style={{ color: 'var(--brand-muted-text)' }}>
            Inspiration
          </p>
          <blockquote
            className="mb-8 pl-6 text-[24px] leading-[1.32] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)', borderLeft: '3px solid var(--brand-olive)' }}
          >
            Clout was created by Lauren Proctor, a marketing industry veteran who co-founded the first influencer
            marketing platform in the world (as far as we know).
          </blockquote>
          <div className="flex flex-col gap-5 text-[16px] leading-[1.7]" style={{ color: 'var(--brand-muted-text)' }}>
            <p>
              Clout&apos;s founder, Lauren Proctor, has spent two decades helping startups and global teams build, scale,
              and stand out. As a digital strategist and growth consultant, she&apos;s worked with emerging ventures and
              private equity–backed brands to refine their voice and grow intelligently.
            </p>
            <p>
              After years of helping companies craft systems for scale, Lauren saw a gap. The smartest individuals and
              teams often have powerful ideas but no time or process to shape them into compelling stories, much less
              optimize them for reach.
            </p>
            <p>
              That insight sparked Clout: a way to combine human intelligence with the speed and structure of marketing
              strategy and AI — giving anyone the ability to create authentic, high-quality content with minimal effort.
              Today, Clout helps founders, executives, and creators find their voice, sharpen their message, and command
              attention.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-5">
            {['Website', 'LinkedIn', 'YouTube', 'X'].map((s) => (
              <Link key={s} href="#" className="text-[15px] font-semibold" style={{ color: 'var(--brand-olive)' }}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 md:py-24 text-center" style={{ background: 'var(--brand-deep-navy)' }}>
        <div className="mx-auto max-w-2xl px-5 md:px-10">
          <h2
            className="text-[28px] leading-[1.15] tracking-[-0.01em] mb-6 md:text-[40px]"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}
          >
            Build lasting influence
          </h2>
          <p className="text-sm leading-[1.8] mb-10" style={{ color: 'rgba(248,247,226,0.6)' }}>
            Transform everyday thinking into channel-optimized content that resonates with your target audience.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-paper-text)', color: 'var(--brand-ink)' }}
          >
            Become a member
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
