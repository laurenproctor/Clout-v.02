import Link from 'next/link'

const EFFECTIVE_DATE = 'April 23, 2026'
const COMPANY_NAME = 'Clout'
const COMPANY_EMAIL = 'legal@clout.you'

const sections = [
  {
    number: '01',
    title: 'Introduction',
    body: `Clout, Inc. ("Clout," "we," "our," or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.`,
  },
  {
    number: '02',
    title: 'Information We Collect',
    subsections: [
      {
        heading: 'Information you provide directly',
        text: 'When you create an account, we collect your name, email address, and password. If you subscribe to a paid plan, our payment processor collects billing information on our behalf — we do not store full payment card details.',
      },
      {
        heading: 'Content you create',
        text: 'We store the voice memos, notes, drafts, and published posts you create within the Service ("User Content") in order to provide and improve the Service for you.',
      },
      {
        heading: 'Usage and device information',
        text: 'We automatically collect information about how you use the Service, including log data (IP address, browser type, pages visited, timestamps), device identifiers, and crash reports.',
      },
      {
        heading: 'Third-party integrations',
        text: 'If you connect a third-party account (e.g., LinkedIn), we receive the access token and any profile data you authorize. We use this solely to publish content on your behalf.',
      },
    ],
  },
  {
    number: '03',
    title: 'How We Use Your Information',
    items: [
      'Provide, operate, and maintain the Service',
      'Process transactions and send related information, including purchase confirmations and invoices',
      'Generate AI-powered content drafts from your inputs',
      'Personalize your experience and deliver features relevant to you',
      'Send transactional and product update emails (you may opt out of marketing emails)',
      'Monitor and analyze usage trends to improve the Service',
      'Detect and prevent fraud, abuse, and security incidents',
      'Comply with legal obligations',
    ],
  },
  {
    number: '04',
    title: 'AI & Your Content',
    body: `Your User Content is processed by AI models to generate drafts and suggestions. We do not use your personal content to train third-party AI models without your explicit consent. AI processing occurs under strict data handling agreements with our model providers, who are prohibited from retaining your content beyond the scope of each request.`,
  },
  {
    number: '05',
    title: 'Sharing of Information',
    body: `We do not sell your personal information. We may share your information in the following limited circumstances:`,
    items: [
      'With service providers who assist in operating the Service (hosting, payments, analytics, email delivery), bound by confidentiality obligations',
      'With third-party platforms you have explicitly authorized (e.g., LinkedIn) to publish your content',
      'In connection with a merger, acquisition, or sale of all or a portion of our assets, with notice to you',
      'When required by law, court order, or government authority',
      'To protect the rights, property, or safety of Clout, our users, or the public',
    ],
  },
  {
    number: '06',
    title: 'Data Retention',
    body: `We retain your personal information for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal, tax, or fraud-prevention purposes.`,
  },
  {
    number: '07',
    title: 'Cookies & Tracking',
    body: `We use cookies and similar tracking technologies to operate the Service, remember your preferences, and analyze usage. You can control cookie settings through your browser. Disabling cookies may affect the functionality of certain features. We do not respond to Do Not Track signals at this time.`,
  },
  {
    number: '08',
    title: 'Security',
    body: `We implement industry-standard technical and organizational measures to protect your information, including encryption in transit (TLS) and at rest, access controls, and regular security reviews. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security. You are responsible for keeping your account credentials confidential.`,
  },
  {
    number: '09',
    title: 'Your Rights & Choices',
    body: `Depending on your location, you may have the following rights regarding your personal information:`,
    items: [
      'Access — request a copy of the personal data we hold about you',
      'Correction — request that inaccurate or incomplete data be corrected',
      'Deletion — request that we delete your personal data',
      'Portability — receive your data in a structured, machine-readable format',
      'Objection — object to certain processing activities, such as direct marketing',
      'Withdrawal of consent — where processing is based on consent, withdraw it at any time',
    ],
    footer: `To exercise any of these rights, contact us at ${COMPANY_EMAIL}. We will respond within 30 days.`,
  },
  {
    number: '10',
    title: 'Children\'s Privacy',
    body: `The Service is not directed to children under the age of 13 (or 16 in the European Economic Area). We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us and we will promptly delete it.`,
  },
  {
    number: '11',
    title: 'International Transfers',
    body: `Clout is based in the United States. If you access the Service from outside the United States, your information will be transferred to and processed in the United States. We rely on Standard Contractual Clauses and other approved transfer mechanisms where required to lawfully transfer personal data from the European Economic Area, United Kingdom, or Switzerland.`,
  },
  {
    number: '12',
    title: 'California Privacy Rights',
    body: `If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and how it is used, the right to delete your personal information, and the right to opt out of the sale of personal information. We do not sell personal information. To submit a request, contact us at ${COMPANY_EMAIL}.`,
  },
  {
    number: '13',
    title: 'Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we do, we will revise the effective date at the top of this page and, for material changes, notify you via email or a prominent notice within the Service. Your continued use of the Service after the effective date constitutes your acceptance of the updated policy.`,
  },
  {
    number: '14',
    title: 'Contact Us',
    body: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at ${COMPANY_EMAIL}. You may also reach us by mail at Clout, Inc., [Address], United States.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ color: 'var(--brand-ink)', background: 'var(--brand-paper)' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-10 py-5 border-b"
        style={{ borderColor: 'var(--brand-border-light)' }}
      >
        <Link
          href="/"
          className="text-lg tracking-[-0.01em] transition-opacity hover:opacity-70"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Clout
        </Link>
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

      {/* Header */}
      <header
        className="border-b px-10 py-20"
        style={{ borderColor: 'var(--brand-border-light)' }}
      >
        <div className="max-w-3xl">
          <p
            className="text-[11px] uppercase tracking-[0.12em] mb-6"
            style={{ color: 'var(--brand-muted-text)' }}
          >
            Legal
          </p>
          <h1
            className="text-[52px] leading-[1.05] tracking-[-0.02em] mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'var(--brand-muted-text)' }}>
            Effective {EFFECTIVE_DATE}
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="flex px-10 py-16 gap-16 max-w-6xl">

        {/* Sticky TOC — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-10">
            <p
              className="text-[10px] uppercase tracking-[0.12em] mb-4"
              style={{ color: 'var(--brand-muted-text)' }}
            >
              Contents
            </p>
            <nav className="flex flex-col gap-2">
              {sections.map((s) => (
                <a
                  key={s.number}
                  href={`#section-${s.number}`}
                  className="text-xs leading-snug transition-colors hover:opacity-100 flex gap-2"
                  style={{ color: 'var(--brand-muted-text)' }}
                >
                  <span className="tabular-nums opacity-50">{s.number}</span>
                  <span>{s.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Sections */}
        <main className="flex-1 max-w-2xl">

          {/* Intro */}
          <p
            className="text-base leading-[1.75] mb-14"
            style={{ color: 'var(--brand-muted-text)' }}
          >
            Your privacy matters to us. This policy describes the personal information
            {' '}{COMPANY_NAME} collects, why we collect it, and the choices you have.
          </p>

          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--brand-border-light)' }}>
            {sections.map((s) => (
              <section
                key={s.number}
                id={`section-${s.number}`}
                className="py-10 flex gap-10 scroll-mt-10"
              >
                <span
                  className="text-[11px] tabular-nums shrink-0 pt-[3px]"
                  style={{ color: 'var(--brand-muted-text)', fontFamily: 'var(--font-mono)' }}
                >
                  {s.number}
                </span>
                <div className="flex-1">
                  <h2
                    className="text-[22px] leading-[1.2] tracking-[-0.01em] mb-4"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {s.title}
                  </h2>

                  {s.body && (
                    <p
                      className="text-[15px] leading-[1.75] mb-4"
                      style={{ color: 'var(--brand-muted-text)' }}
                    >
                      {s.body}
                    </p>
                  )}

                  {s.subsections && (
                    <div className="flex flex-col gap-4 mt-4">
                      {s.subsections.map((sub) => (
                        <div key={sub.heading}>
                          <p
                            className="text-[13px] font-medium uppercase tracking-[0.06em] mb-1"
                            style={{ color: 'var(--brand-ink)' }}
                          >
                            {sub.heading}
                          </p>
                          <p
                            className="text-[15px] leading-[1.75]"
                            style={{ color: 'var(--brand-muted-text)' }}
                          >
                            {sub.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.items && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {s.items.map((item) => (
                        <li
                          key={item}
                          className="text-[15px] leading-[1.75] flex gap-3"
                          style={{ color: 'var(--brand-muted-text)' }}
                        >
                          <span className="mt-[9px] w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--brand-muted-text)' }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.footer && (
                    <p
                      className="text-[15px] leading-[1.75] mt-4"
                      style={{ color: 'var(--brand-muted-text)' }}
                    >
                      {s.footer}
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div
            className="mt-14 pt-10 border-t text-xs leading-relaxed"
            style={{ borderColor: 'var(--brand-border-light)', color: 'var(--brand-muted-text)' }}
          >
            <p>
              Questions about this policy?{' '}
              <a
                href={`mailto:${COMPANY_EMAIL}`}
                className="underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand-ink)' }}
              >
                {COMPANY_EMAIL}
              </a>
            </p>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className="mt-10 border-t px-10 py-8 flex items-center justify-between"
        style={{ borderColor: 'var(--brand-border-light)' }}
      >
        <span
          className="text-sm"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Clout
        </span>
        <p className="text-xs" style={{ color: 'var(--brand-muted-text)' }}>
          © {new Date().getFullYear()} {COMPANY_NAME}, Inc. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs" style={{ color: 'var(--brand-muted-text)' }}>
          <Link href="/terms-of-service" className="transition-opacity hover:opacity-70">Terms</Link>
          <span className="font-medium" style={{ color: 'var(--brand-ink)' }}>Privacy</span>
        </div>
      </footer>

    </div>
  )
}
