import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy-policy(.*)',
  '/terms-of-service(.*)',
  '/api/webhooks(.*)',
  '/api/trigger(.*)',
  '/api/admin(.*)',  // Admin routes use x-admin-secret / cron bearer auth, not Clerk
  '/',
  '/features(.*)',
  '/pricing(.*)',
  '/about(.*)',
  '/contact(.*)',
  '/blog(.*)',
  '/academy(.*)',
  '/support(.*)',
])

const isOperatorRoute = createRouteMatcher(['/operator(.*)'])

// Paths that are not workspace-scoped — don't extract a slug from them
const isNonWorkspacePath = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/operator(.*)',
  '/api(.*)',
  '/privacy-policy(.*)',
  '/terms-of-service(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  if (isOperatorRoute(req)) {
    const { sessionClaims } = await auth()
    const operatorRole = (sessionClaims?.metadata as Record<string, unknown>)?.operator_role
    if (!operatorRole) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Extract workspace slug from first path segment and inject as header.
  // e.g. /amlon/feed → x-workspace-slug: amlon
  // Also sync the cookie so API routes (which are excluded from slug extraction above)
  // always resolve the correct workspace via getSession() → clout-active-workspace cookie.
  if (!isNonWorkspacePath(req)) {
    const slug = req.nextUrl.pathname.split('/')[1]
    if (slug) {
      const res = NextResponse.next()
      res.headers.set('x-workspace-slug', slug)
      res.cookies.set('clout-active-workspace', slug, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: false,
      })
      return res
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
