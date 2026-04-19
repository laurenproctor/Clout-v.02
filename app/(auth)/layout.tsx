export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="mb-8 text-center">
        <span className="text-lg font-semibold tracking-tight text-zinc-900">Clout</span>
      </div>
      {children}
    </div>
  )
}
