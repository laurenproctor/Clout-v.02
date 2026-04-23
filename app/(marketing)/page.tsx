import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white" style={{ color: 'var(--brand-ink)' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-10 py-5 border-b"
        style={{ borderColor: 'var(--brand-border-light)' }}
      >
        <span
          className="text-lg tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Clout
        </span>
        <div className="flex items-center gap-5">
          <Link
            href="/sign-in"
            className="text-sm transition-colors"
            style={{ color: 'var(--brand-muted-text)' }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--brand-blue)' }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-10 py-28 text-center">
        <p
          className="text-[11px] uppercase tracking-[0.12em] mb-10"
          style={{ color: 'var(--brand-muted-text)' }}
        >
          Thought leadership, synthesized.
        </p>
        <h1
          className="text-[56px] leading-[1.05] tracking-[-0.02em] mb-8"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
        >
          Turn daily ideas into powerful<br />thought leadership.
        </h1>
        <p
          className="text-[16px] leading-[1.7] max-w-xl mx-auto mb-12"
          style={{ color: 'var(--brand-muted-text)' }}
        >
          Your everyday thoughts deserve more than a notes app. Clout transforms
          fragmented ideas into polished content that positions you as the expert
          you already are.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="px-8 py-3.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--brand-blue)' }}
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              border: '1px solid var(--brand-blue)',
              color: 'var(--brand-blue)',
            }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section
        className="border-t py-20"
        style={{
          background: 'var(--brand-surface)',
          borderColor: 'var(--brand-border-light)',
        }}
      >
        <div className="mx-auto max-w-4xl px-10">
          <div className="flex items-center gap-3 mb-16">
            <p
              className="text-[10px] uppercase tracking-[0.14em] shrink-0"
              style={{ color: '#BBBBBB' }}
            >
              How it works
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--brand-border-light)' }} />
          </div>
          <div className="grid grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Capture',
                description:
                  'Dump your raw thoughts — text, voice, URL, or a quick structured prompt. It all feeds the same pipeline.',
              },
              {
                step: '02',
                title: 'Apply a Lens',
                description:
                  'Choose a perspective template: Contrarian Take, First Principles, Story Arc. Your Lens amplifies your worldview.',
              },
              {
                step: '03',
                title: 'Publish',
                description:
                  'Get LinkedIn posts, newsletters, and threads — in your voice, shaped by your mental models and philosophies.',
              },
            ].map(({ step, title, description }) => (
              <div key={step}>
                <p
                  className="font-mono text-xs mb-4"
                  style={{ color: 'var(--brand-muted-text)' }}
                >
                  {step}
                </p>
                <h3
                  className="text-[20px] leading-[1.2] tracking-[-0.01em] mb-3"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-[1.8]"
                  style={{ color: 'var(--brand-muted-text)' }}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="border-t py-20"
        style={{ borderColor: 'var(--brand-border-light)' }}
      >
        <div className="mx-auto max-w-4xl px-10">
          <div className="flex items-center gap-3 mb-16">
            <p
              className="text-[10px] uppercase tracking-[0.14em] shrink-0"
              style={{ color: '#BBBBBB' }}
            >
              Built for thought leaders
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--brand-border-light)' }} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              {
                title: 'Lenses that think like you',
                description:
                  'Define your mental models and philosophies once. Every generation uses them to create content that sounds unmistakably like you — not generic AI.',
              },
              {
                title: 'Every modality, one pipeline',
                description:
                  'Voice memo at 6am? Rough note on your phone? URL you found interesting? It all goes through the same transformation pipeline.',
              },
              {
                title: 'Operator-assisted or fully self-serve',
                description:
                  'Run Clout yourself, or work with a content operator who reviews and refines outputs on your behalf. Same system, either way.',
              },
              {
                title: 'Clout Private',
                description:
                  "A personal feed just for you. Capture thoughts you're not ready to publish. Clout extracts the insight and reflects it back using your own frameworks.",
              },
            ].map(({ title, description }) => (
              <div
                key={title}
                className="p-8 bg-white"
                style={{ border: '1px solid var(--brand-border-light)' }}
              >
                <h3
                  className="text-[18px] leading-[1.2] tracking-[-0.01em] mb-3"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-[1.8]"
                  style={{ color: 'var(--brand-muted-text)' }}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24" style={{ background: 'var(--brand-deep-navy)' }}>
        <div className="mx-auto max-w-2xl px-10 text-center">
          <h2
            className="text-[40px] leading-[1.1] tracking-[-0.01em] text-white mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Your best ideas are already there.<br />We just help you find them.
          </h2>
          <p className="text-sm leading-[1.8] mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Start for free. No credit card required. Your first 10 captures are on us.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--brand-paper)', color: 'var(--brand-ink)' }}
          >
            Get started for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--brand-deep-navy)' }}>
        <div
          className="mx-auto max-w-5xl px-10 pt-16 pb-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="grid grid-cols-4 gap-12 mb-12">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.12em] mb-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Clout
              </p>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Seamless thought leadership. We transform raw ideas into refined content that
                positions you as the expert you already are.
              </p>
            </div>
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.12em] mb-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Platform
              </p>
              {['Features', 'Pricing', 'About', 'Academy'].map((label) => (
                <Link
                  key={label}
                  href={`/${label.toLowerCase()}`}
                  className="block text-[13px] mb-2 transition-colors hover:opacity-90"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.12em] mb-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Resources
              </p>
              {['Blog', 'Support', 'Brand Guidelines'].map((label) => (
                <Link
                  key={label}
                  href={`/${label.toLowerCase().replace(' ', '-')}`}
                  className="block text-[13px] mb-2 transition-colors hover:opacity-90"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.12em] mb-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Connect
              </p>
              <Link
                href="mailto:hello@clout.you"
                className="block text-[13px] mb-2 transition-colors hover:opacity-90"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                hello@clout.you
              </Link>
              <Link
                href="https://linkedin.com/company/70929805"
                className="block text-[13px] mb-4 transition-colors hover:opacity-90"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                LinkedIn
              </Link>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                A Storyworlding company.<br />Made with care in NYC.
              </p>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              © 2026 Clout. All rights reserved.
            </span>
            <div className="flex gap-6">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((label) => (
                <Link
                  key={label}
                  href={`/${label.toLowerCase().replace(/ /g, '-')}`}
                  className="text-[11px] transition-colors hover:opacity-70"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
