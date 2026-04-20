'use client'

import { Component, ReactNode } from 'react'
import Link from 'next/link'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <span className="text-xl">⚠</span>
          </div>
          <h2 className="text-base font-semibold text-zinc-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-500 max-w-sm mb-6">
            An unexpected error occurred. Try refreshing the page.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-zinc-400 font-mono mb-6 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
