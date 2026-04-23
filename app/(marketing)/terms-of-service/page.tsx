import Link from 'next/link'

const EFFECTIVE_DATE = 'April 23, 2026'
const COMPANY_NAME = 'Clout'
const COMPANY_EMAIL = 'legal@clout.you'

const sections = [
  {
    number: '01',
    title: 'Acceptance of Terms',
    body: `By accessing or using Clout ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. These Terms apply to all visitors, users, and others who access or use the Service.`,
  },
  {
    number: '02',
    title: 'Description of Service',
    body: `Clout is an AI-powered thought leadership platform that transforms your ideas, voice memos, and notes into polished content for professional publishing. We provide tools for content capture, synthesis, scheduling, and distribution across professional networks.`,
  },
  {
    number: '03',
    title: 'Eligibility',
    body: `You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant that you have the legal capacity to enter into a binding agreement and meet all eligibility requirements. We reserve the right to refuse service to anyone at our sole discretion.`,
  },
  {
    number: '04',
    title: 'Your Account',
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account. Clout cannot and will not be liable for any loss or damage arising from your failure to protect your account information.`,
  },
  {
    number: '05',
    title: 'Intellectual Property & Content',
    body: `You retain full ownership of any content you submit, post, or display on or through the Service ("User Content"). By providing User Content, you grant Clout a limited, non-exclusive, royalty-free license to use, process, and store that content solely to provide the Service to you. We do not sell or share your content with third parties for their own purposes. All AI-generated content produced using your inputs is owned by you, subject to applicable law.`,
  },
  {
    number: '06',
    title: 'Acceptable Use',
    body: `You agree not to use the Service to: (a) publish false, defamatory, or misleading content; (b) infringe the intellectual property rights of others; (c) transmit spam or unsolicited communications; (d) attempt to gain unauthorized access to the Service or its related systems; (e) violate any applicable local, national, or international law or regulation; or (f) harass, abuse, or harm another person.`,
  },
  {
    number: '07',
    title: 'Subscriptions & Billing',
    body: `Certain features of the Service are available only through a paid subscription. Subscriptions are billed in advance on a monthly or annual basis and are non-refundable except where required by law. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period. Clout reserves the right to change pricing with 30 days' notice.`,
  },
  {
    number: '08',
    title: 'Third-Party Services',
    body: `The Service integrates with third-party platforms including LinkedIn and other social networks. Your use of those platforms is governed by their respective terms of service. Clout is not responsible for the availability, accuracy, or content of third-party services, nor for any changes those services make to their APIs or policies that affect the Service.`,
  },
  {
    number: '09',
    title: 'Privacy',
    body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated by reference into these Terms. Please review our Privacy Policy to understand our practices. By using the Service, you consent to the collection and use of your information as described therein.`,
  },
  {
    number: '10',
    title: 'Disclaimers',
    body: `The Service is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. Clout does not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.`,
  },
  {
    number: '11',
    title: 'Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Clout shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of (or inability to access or use) the Service, even if we have been advised of the possibility of such damages.`,
  },
  {
    number: '12',
    title: 'Termination',
    body: `We may terminate or suspend your account at any time, with or without cause or notice, at our sole discretion. Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.`,
  },
  {
    number: '13',
    title: 'Governing Law',
    body: `These Terms shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in Delaware.`,
  },
  {
    number: '14',
    title: 'Changes to Terms',
    body: `Clout reserves the right to modify these Terms at any time. We will notify you of material changes by posting a notice on our website or sending you an email. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the new Terms.`,
  },
  {
    number: '15',
    title: 'Contact',
    body: `If you have questions about these Terms, please contact us at ${COMPANY_EMAIL}.`,
  },
]

export default function TermsPage() {
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
            Terms of Service
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
            These Terms of Service govern your use of {COMPANY_NAME} and constitute a
            legally binding agreement between you and {COMPANY_NAME}, Inc. Please read
            them carefully before using the Service.
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
                <div>
                  <h2
                    className="text-[22px] leading-[1.2] tracking-[-0.01em] mb-4"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {s.title}
                  </h2>
                  <p
                    className="text-[15px] leading-[1.75]"
                    style={{ color: 'var(--brand-muted-text)' }}
                  >
                    {s.body}
                  </p>
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
              Questions about these Terms?{' '}
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
          <span className="font-medium" style={{ color: 'var(--brand-ink)' }}>Terms</span>
          <Link href="/privacy-policy" className="transition-opacity hover:opacity-70">Privacy</Link>
        </div>
      </footer>

    </div>
  )
}
