export default function OnboardingPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">Set up your workspace</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Tell us about yourself so we can personalize your experience.
      </p>
      <div className="mt-6 space-y-4">
        <div className="h-10 w-full rounded-md bg-zinc-100 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-zinc-100 animate-pulse" />
        <div className="h-10 w-3/4 rounded-md bg-zinc-100 animate-pulse" />
      </div>
      <p className="mt-6 text-xs text-zinc-400">Onboarding flow coming soon.</p>
    </div>
  )
}
