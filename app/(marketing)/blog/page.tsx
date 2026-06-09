import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { POSTS } from '@/lib/marketing/posts'

export const metadata = {
  title: 'Blog — Clout',
  description: 'Tools, frameworks, and field notes to help you grow clarity, confidence, and impact.',
}

export default function BlogPage() {
  const featured = POSTS.find((p) => p.featured) ?? POSTS[0]
  const rest = POSTS.filter((p) => p !== featured)

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 text-center md:px-10 md:pt-24">
        <p className="text-[11px] uppercase tracking-[0.12em] mb-8" style={{ color: 'var(--brand-muted-text)' }}>
          Blog
        </p>
        <h1
          className="text-[36px] leading-[1.05] tracking-[-0.02em] mb-6 md:text-[56px]"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}
        >
          Ideas on influence
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-xl mx-auto" style={{ color: 'var(--brand-muted-text)' }}>
          Tools, frameworks, and field notes to help you grow clarity, confidence, and impact.
        </p>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 md:px-10">
          {/* Featured */}
          <Link
            href={`/blog/${featured.slug}`}
            className="grid grid-cols-1 overflow-hidden transition-shadow hover:shadow-md md:grid-cols-[1.1fr_1fr]"
            style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)', boxShadow: '0 2px 6px rgba(33,33,15,0.07)' }}
          >
            <div className="hidden md:block" style={{ background: 'var(--brand-surface)', minHeight: 280 }} />
            <div className="flex flex-col justify-center gap-3.5 p-8 md:p-10">
              <div className="flex items-center gap-3">
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}>
                  Featured
                </span>
                <span className="text-[13px]" style={{ color: 'var(--brand-muted-text)' }}>
                  {featured.date} · {featured.read}
                </span>
              </div>
              <h2 className="text-[28px] leading-[1.15] tracking-[-0.015em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                {featured.title}
              </h2>
              <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--brand-muted-text)' }}>
                {featured.excerpt}
              </p>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--brand-olive)' }}>
                Read article →
              </span>
            </div>
          </Link>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {rest.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="flex flex-col overflow-hidden transition-shadow hover:shadow-md"
                style={{ background: 'var(--brand-paper)', border: '1px solid var(--brand-border-light)', boxShadow: '0 2px 6px rgba(33,33,15,0.07)' }}
              >
                <div style={{ background: 'var(--brand-surface)', height: 160 }} />
                <div className="flex flex-1 flex-col gap-2.5 p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'var(--brand-surface)', color: 'var(--brand-ink)', border: '1px solid var(--brand-border-light)' }}>
                      {p.category}
                    </span>
                    <span className="text-[13px]" style={{ color: 'var(--brand-muted-text)' }}>
                      {p.read}
                    </span>
                  </div>
                  <h3 className="text-[22px] leading-[1.22] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                    {p.title}
                  </h3>
                  <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--brand-muted-text)' }}>
                    {p.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
