import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-100">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Clout</span>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 mb-8">
          Thought leadership, accelerated
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
          Turn raw thoughts into
          <br />
          publish-ready content
        </h1>
        <p className="mt-6 text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
          Clout captures your ideas — voice memos, rough notes, URLs — and transforms them into polished thought leadership content in under 60 seconds, using your unique perspective and voice.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Start for free →
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-20">
        <div className="mx-auto max-w-4xl px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-10 text-center">
            How it works
          </p>
          <div className="grid grid-cols-3 gap-8">
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
                <p className="text-xs font-mono text-zinc-300 mb-3">{step}</p>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-100 py-20">
        <div className="mx-auto max-w-4xl px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-10 text-center">
            Built for thought leaders
          </p>
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
                  'A personal feed just for you. Capture thoughts you\'re not ready to publish. Clout extracts the insight and reflects it back using your own frameworks.',
              },
            ].map(({ title, description }) => (
              <div
                key={title}
                className="rounded-lg border border-zinc-200 bg-white p-6"
              >
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-zinc-100 bg-zinc-900 py-20">
        <div className="mx-auto max-w-2xl px-8 text-center">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Ready to build your authority?
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            Start for free. No credit card required. Your first 10 captures are on us.
          </p>
          <Link
            href="/sign-up"
            className="rounded-md bg-white px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Get started for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900 py-8">
        <div className="mx-auto max-w-4xl px-8 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-400">Clout</span>
          <p className="text-xs text-zinc-600">
            Turn messy raw thoughts into publish-ready authority content in under 60 seconds.
          </p>
        </div>
      </footer>
    </div>
  )
}
