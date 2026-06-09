import Link from 'next/link'

/* Shared marketing nav — Clout DS (olive logo, cream/transparent, warm hairline).
   Server component. */
export function MarketingNav() {
  const links: [string, string][] = [
    ['Features', '/features'],
    ['Pricing', '/pricing'],
    ['About', '/about'],
  ]
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b backdrop-blur md:px-10 md:py-5"
      style={{
        borderColor: 'var(--brand-border-light)',
        background: 'color-mix(in srgb, var(--brand-bg) 82%, transparent)',
      }}
    >
      <Link
        href="/"
        className="text-lg tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-olive)' }}
      >
        Clout
      </Link>

      <div className="hidden items-center gap-7 md:flex">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--brand-ink)' }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/sign-in"
          className="text-sm transition-colors"
          style={{ color: 'var(--brand-muted-text)' }}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand-olive)', color: 'var(--brand-paper-text)' }}
        >
          Get started
        </Link>
      </div>
    </nav>
  )
}
