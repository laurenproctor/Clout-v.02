import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { POSTS, getPost } from '@/lib/marketing/posts'

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  return { title: post ? `${post.title} — Clout` : 'Clout', description: post?.excerpt }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-bg)', color: 'var(--brand-ink)' }}>
      <MarketingNav />

      <article className="mx-auto max-w-2xl px-5 pt-12 pb-16 md:px-10 md:pt-20 md:pb-24">
        <Link href="/blog" className="mb-7 inline-block text-[15px] font-semibold" style={{ color: 'var(--brand-olive)' }}>
          ← All articles
        </Link>

        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'var(--brand-surface)', color: 'var(--brand-ink)', border: '1px solid var(--brand-border-light)' }}>
            {post.category}
          </span>
          <span className="text-[14px]" style={{ color: 'var(--brand-muted-text)' }}>
            {post.date} · {post.read}
          </span>
        </div>

        <h1 className="text-[34px] leading-[1.1] tracking-[-0.022em] md:text-[48px]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
          {post.title}
        </h1>
        <p className="mt-5 text-[20px] leading-[1.5]" style={{ color: 'var(--brand-muted-text)' }}>
          {post.excerpt}
        </p>

        <div className="my-10 h-px" style={{ background: 'var(--brand-border-light)' }} />

        {post.body.map((blk, i) => (
          <div key={i} className="mb-6">
            {blk.h && (
              <h2 className="mb-3 text-[27px] leading-[1.25] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-ink)' }}>
                {blk.h}
              </h2>
            )}
            <p className="text-[18px] leading-[1.7]" style={{ color: 'var(--brand-muted-text)' }}>
              {blk.p}
            </p>
          </div>
        ))}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-7" style={{ borderTop: '1px solid var(--brand-border-light)' }}>
          <span className="text-[15px]" style={{ color: 'var(--brand-muted-text)' }}>
            Written by the Clout team
          </span>
          <Link
            href="/sign-up"
            className="inline-block px-7 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
          >
            Start creating with Clout
          </Link>
        </div>
      </article>

      <MarketingFooter />
    </div>
  )
}
