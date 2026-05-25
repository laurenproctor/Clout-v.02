import type { NextRequest } from 'next/server'

// Reads the workspace slug injected by middleware from the URL path.
// Used by API route handlers to determine which workspace a request targets.
// Returns the raw slug string (e.g. "amlon") — validate membership in the handler.
export function getWorkspaceSlug(request: NextRequest): string | null {
  return request.headers.get('x-workspace-slug')
}
