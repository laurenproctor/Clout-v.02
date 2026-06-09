import Link from 'next/link'

/* Shared marketing footer — slate-deep band. Server component. */
export function MarketingFooter() {
  return (
    <footer style={{ background: 'var(--brand-deep-navy)' }}>
      <div
        className="mx-auto max-w-5xl px-5 pt-10 pb-8 md:px-10 md:pt-16"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="grid grid-cols-2 gap-8 mb-12 md:grid-cols-4 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <p
              className="text-[11px] uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(248,247,226,0.4)' }}
            >
              Clout
            </p>
            <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(248,247,226,0.6)' }}>
              Seamless thought leadership. We transform raw ideas into refined content that
              positions you as the expert you already are.
            </p>
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(248,247,226,0.4)' }}
            >
              Platform
            </p>
            {[
              ['Features', '/features'],
              ['Pricing', '/pricing'],
              ['About', '/about'],
              ['Academy', '/academy'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="block text-[13px] mb-2 transition-opacity hover:opacity-90"
                style={{ color: 'rgba(248,247,226,0.6)' }}
              >
                {label}
              </Link>
            ))}
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(248,247,226,0.4)' }}
            >
              Resources
            </p>
            {[
              ['Blog', '/blog'],
              ['Support', '/support'],
              ['Brand Guidelines', '/clout-brand-guidelines.html'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="block text-[13px] mb-2 transition-opacity hover:opacity-90"
                style={{ color: 'rgba(248,247,226,0.6)' }}
              >
                {label}
              </Link>
            ))}
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(248,247,226,0.4)' }}
            >
              Connect
            </p>
            <Link
              href="mailto:hello@clout.you"
              className="block text-[13px] mb-2 transition-opacity hover:opacity-90"
              style={{ color: 'rgba(248,247,226,0.6)' }}
            >
              hello@clout.you
            </Link>
            <Link
              href="https://linkedin.com/company/70929805"
              className="block text-[13px] mb-4 transition-opacity hover:opacity-90"
              style={{ color: 'rgba(248,247,226,0.6)' }}
            >
              LinkedIn
            </Link>
            <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(248,247,226,0.4)' }}>
              A Storyworlding company.<br />Made with care in NYC.
            </p>
          </div>
        </div>

        <div
          className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="text-[11px]" style={{ color: 'rgba(248,247,226,0.4)' }}>
            © 2026 Clout. All rights reserved.
          </span>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((label) => (
              <Link
                key={label}
                href={`/${label.toLowerCase().replace(/ /g, '-')}`}
                className="text-[11px] transition-opacity hover:opacity-70"
                style={{ color: 'rgba(248,247,226,0.4)' }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
