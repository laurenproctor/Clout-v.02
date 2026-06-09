import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

/*
 * Marketing homepage — re-skinned to the Clout design system (clout.you look):
 * cream background, olive primary, dark-slate "How it works" band, white feature
 * cards with warm hairlines + soft shadows. Copy/structure unchanged from the
 * original; now uses the shared MarketingNav / MarketingFooter.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center md:px-10 md:py-28">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-10" style={{ color: 'var(--brand-muted-text)' }}>
          Thought leadership, synthesized.
        </p>
        <h1
          className="text-[32px] leading-[1.1] tracking-[-0.02em] mb-8 sm:text-[44px] md:text-[56px] md:leading-[1.05]"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
        >
          Turn daily ideas into powerful<br />thought leadership.
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto mb-12" style={{ color: 'var(--brand-muted-text)' }}>
          Your everyday thoughts deserve more than a notes app. Clout transforms fragmented ideas into polished
          content that positions you as the expert you already are.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/sign-up"
            className="px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 w-full sm:w-auto text-center"
            style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3.5 text-sm font-medium transition-colors hover:opacity-80 w-full sm:w-auto text-center"
            style={{ border: '1px solid var(--brand-olive)', color: 'var(--brand-olive)' }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works — dark slate band */}
      <section className="py-16 md:py-20" style={{ background: 'var(--brand-slate)' }}>
        <div className="mx-auto max-w-4xl px-5 md:px-10">
          <div className="flex items-center gap-3 mb-12 md:mb-16">
            <p className="text-[10px] uppercase tracking-[0.14em] shrink-0" style={{ color: 'var(--brand-paper-muted)' }}>
              How it works
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 md:gap-12">
            {[
              { step: '01', title: 'Capture', description: 'Dump your raw thoughts — text, voice, URL, or a quick structured prompt. It all feeds the same pipeline.' },
              { step: '02', title: 'Apply a Lens', description: 'Choose a perspective template: Contrarian Take, First Principles, Story Arc. Your Lens amplifies your worldview.' },
              { step: '03', title: 'Publish', description: 'Get LinkedIn posts, newsletters, and threads — in your voice, shaped by your mental models and philosophies.' },
            ].map(({ step, title, description }) => (
              <div key={step}>
                <p className="font-mono text-xs mb-4" style={{ color: 'var(--brand-paper-muted)' }}>{step}</p>
                <h3 className="text-[20px] leading-[1.2] tracking-[-0.01em] mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-[1.8]" style={{ color: 'var(--brand-paper-muted)' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — cream, white cards */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-10">
          <div className="flex items-center gap-3 mb-12 md:mb-16">
            <p className="text-[10px] uppercase tracking-[0.14em] shrink-0" style={{ color: 'var(--brand-muted-text)' }}>
              Built for thought leaders
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--brand-border-light)' }} />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { title: 'Lenses that think like you', description: 'Define your mental models and philosophies once. Every generation uses them to create content that sounds unmistakably like you — not generic AI.' },
              { title: 'Every modality, one pipeline', description: 'Voice memo at 6am? Rough note on your phone? URL you found interesting? It all goes through the same transformation pipeline.' },
              { title: 'Operator-assisted or fully self-serve', description: 'Run Clout yourself, or work with a content operator who reviews and refines outputs on your behalf. Same system, either way.' },
              { title: 'Clout Private', description: "A personal feed just for you. Capture thoughts you're not ready to publish. Clout extracts the insight and reflects it back using your own frameworks." },
            ].map(({ title, description }) => (
              <div
                key={title}
                className="p-6 md:p-8"
                style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)', boxShadow: '0 2px 6px rgba(33, 33, 15, 0.07)' }}
              >
                <h3 className="text-[18px] leading-[1.2] tracking-[-0.01em] mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-[1.8]" style={{ color: 'var(--brand-muted-text)' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — slate-deep */}
      <section className="py-16 md:py-24" style={{ background: 'var(--brand-deep-navy)' }}>
        <div className="mx-auto max-w-2xl px-5 text-center md:px-10">
          <h2 className="text-[28px] leading-[1.15] tracking-[-0.01em] mb-6 sm:text-[36px] md:text-[40px] md:leading-[1.1]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}>
            Your best ideas are already there.<br />We just help you find them.
          </h2>
          <p className="text-sm leading-[1.8] mb-10" style={{ color: 'rgba(248,247,226,0.6)' }}>
            Start for free. No credit card required. Your first 10 captures are on us.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-paper-text)', color: 'var(--brand-ink)' }}
          >
            Get started for free →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
