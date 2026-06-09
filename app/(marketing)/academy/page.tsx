import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

const TRACKS: { name: string; tag: string; lessons: [string, string, string][] }[] = [
  {
    name: 'Find your voice',
    tag: 'Foundations',
    lessons: [
      ['Define your point of view', '8 min', "Locate the one belief you'd defend in a room of skeptics — your north star for everything you publish."],
      ['Audit your language', '6 min', 'Find the words and phrases that are unmistakably yours, and the borrowed ones to retire.'],
      ['The one-sentence thesis', '5 min', 'Compress your message until it fits in a single, undeniable line.'],
    ],
  },
  {
    name: 'Build the capture habit',
    tag: 'Practice',
    lessons: [
      ['Capture without friction', '7 min', 'Set up a thirty-second pipeline so no idea is ever lost to the moment again.'],
      ['From voice note to draft', '9 min', 'Turn raw, messy fragments into a structured first draft without staring at a blank page.'],
      ['A week of notes, a month of content', '6 min', 'Spot the patterns in your own thinking and turn repetition into a point of view.'],
    ],
  },
  {
    name: 'Amplify everywhere',
    tag: 'Distribution',
    lessons: [
      ['One idea, many channels', '8 min', 'Use Lenses to adapt a single belief for essays, posts, podcasts, and video — without diluting it.'],
      ['Writing for the scroll', '7 min', "Earn the first line so the rest gets read, on every platform's terms."],
      ['Measure what matters', '6 min', 'Read engagement and sentiment as signal, not scoreboard, and let it sharpen your message.'],
    ],
  },
]

export const metadata = {
  title: 'Academy — Clout',
  description: 'Short, practical lessons on finding your voice, capturing ideas, and building a body of work that lasts.',
}

export default function AcademyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 text-center md:px-10 md:pt-24">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-8" style={{ color: 'var(--brand-muted-text)' }}>
          Academy
        </p>
        <h1 className="text-[36px] leading-[1.05] tracking-[-0.02em] mb-6 md:text-[56px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
          Clout Academy
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto" style={{ color: 'var(--brand-muted-text)' }}>
          Short, practical lessons on finding your voice, capturing ideas, and building a body of work that lasts.
        </p>
      </section>

      {/* Start here */}
      <section className="pb-4">
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          <div
            className="grid grid-cols-1 overflow-hidden md:grid-cols-[1fr_1.1fr]"
            style={{ background: 'var(--brand-slate)', border: '1px solid var(--brand-slate)' }}
          >
            <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
              <span className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'rgba(248,247,226,0.16)', color: 'var(--brand-paper-text)' }}>
                Start here
              </span>
              <h2 className="text-[28px] leading-[1.15] tracking-[-0.015em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-paper-text)' }}>
                The thought leadership operating system
              </h2>
              <p className="text-[16px] leading-[1.6]" style={{ color: 'var(--brand-paper-muted)' }}>
                A ten-minute primer on the Capture → Clarify → Amplify loop — the system behind everything else in
                the Academy.
              </p>
              <Link
                href="/sign-up"
                className="w-fit px-7 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand-paper-text)', color: 'var(--brand-ink)' }}
              >
                Begin the primer
              </Link>
            </div>
            <div className="hidden md:block" style={{ background: 'var(--brand-deep-navy)' }} />
          </div>
        </div>
      </section>

      {/* Tracks */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          <div className="flex items-center gap-3 mb-12">
            <p className="text-[10px] uppercase tracking-[0.14em] shrink-0" style={{ color: 'var(--brand-muted-text)' }}>
              Curriculum
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--brand-border-light)' }} />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRACKS.map((t) => (
              <div
                key={t.name}
                className="p-7"
                style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)', boxShadow: '0 2px 6px rgba(33,33,15,0.07)' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--brand-olive)' }}>
                  {t.tag}
                </p>
                <h3 className="text-[24px] tracking-[-0.01em] mb-5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                  {t.name}
                </h3>
                <div className="flex flex-col">
                  {t.lessons.map(([title, dur, desc], i) => (
                    <div key={title} className="flex gap-3.5 py-4" style={{ borderTop: '1px solid var(--brand-border-light)' }}>
                      <span className="w-5 shrink-0 text-[18px] leading-[1.4]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-olive)' }}>
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-semibold" style={{ color: 'var(--brand-ink)' }}>{title}</span>
                        <span className="text-[13px]" style={{ color: 'var(--brand-muted-text)' }}>{dur}</span>
                        <p className="mt-0.5 text-[14px] leading-[1.55]" style={{ color: 'var(--brand-muted-text)' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link href="/sign-up" className="px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90" style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}>
              Get full access
            </Link>
            <Link href="/contact" className="px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-80" style={{ border: '1px solid var(--brand-olive)', color: 'var(--brand-olive)' }}>
              Request a topic
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
